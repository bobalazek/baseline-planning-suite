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
export function ProjectPicker({ projects, selectedId, onSelect }: Props) {
  return (
    <label className="delivery-field">
      <span>Project</span>
      <select
        value={selectedId ?? ''}
        onChange={(event) => onSelect(event.target.value as ProjectId)}
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name} · {project.startDate.slice(0, 7)} → {project.endDate.slice(0, 7)}
          </option>
        ))}
      </select>
    </label>
  );
}
