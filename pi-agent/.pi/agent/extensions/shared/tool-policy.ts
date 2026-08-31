import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export type PermissionProfile = "safe" | "ask" | "yolo";

export const READ_ONLY_TOOL_NAMES = new Set(["read", "grep", "find", "ls"]);

export interface ToolPolicyUpdate {
	baseTools?: string[];
	presetTools?: string[] | null;
	permissionProfile?: PermissionProfile;
	planMode?: boolean;
}

export interface ToolPolicySnapshot {
	baseTools: string[];
	permissionProfile: PermissionProfile;
}

class ToolPolicy {
	private baseTools: string[] | undefined;
	private presetTools: string[] | undefined;
	private permissionProfile: PermissionProfile = "safe";
	private planMode = false;

	constructor(private readonly pi: ExtensionAPI) {}

	update(update: ToolPolicyUpdate): void {
		this.baseTools ??= this.pi.getActiveTools();
		if (update.baseTools) this.baseTools = update.baseTools;
		if (update.presetTools !== undefined) {
			this.presetTools = update.presetTools ?? undefined;
		}
		if (update.permissionProfile) {
			this.permissionProfile = update.permissionProfile;
		}
		if (update.planMode !== undefined) this.planMode = update.planMode;
		this.apply();
	}

	getPermissionProfile(): PermissionProfile {
		return this.permissionProfile;
	}

	snapshot(): ToolPolicySnapshot {
		return {
			baseTools: [...(this.baseTools ?? this.pi.getActiveTools())],
			permissionProfile: this.permissionProfile,
		};
	}

	private apply(): void {
		const baseTools = this.baseTools ?? this.pi.getActiveTools();
		const baseToolNames = new Set(baseTools);
		const requested = (this.presetTools ?? baseTools)
			.filter((name) => baseToolNames.has(name));
		const effective = this.planMode || this.permissionProfile === "safe"
			? baseTools.filter((name) => READ_ONLY_TOOL_NAMES.has(name))
			: requested;
		this.pi.setActiveTools([...new Set(effective)]);
	}
}

const policies = new WeakMap<ExtensionAPI, ToolPolicy>();

export function getToolPolicy(pi: ExtensionAPI): ToolPolicy {
	let policy = policies.get(pi);
	if (!policy) {
		policy = new ToolPolicy(pi);
		policies.set(pi, policy);
	}
	return policy;
}
