import type { Project, ProjectId } from '@repo/shared-common';
interface Props {
    readonly projects: readonly Project[];
    readonly selectedId: ProjectId | null;
    readonly onSelect: (projectId: ProjectId) => void;
}
/**
 * Projects overlap and share people. The grid shows one at a time, but capacity is always summed
 * across all of them — which is why a person can be flagged here for load the planner cannot see.
 */
export declare function ProjectPicker({ projects, selectedId, onSelect }: Props): import("react").JSX.Element;
export {};
