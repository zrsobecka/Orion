import { Orbit } from "lucide-react";

interface ProjectPlanetProps {
  projectName: string;
}

export function ProjectPlanet({ projectName }: ProjectPlanetProps) {
  return (
    <div className="mission-core" aria-label={`Project planet: ${projectName}`}>
      <span className="mission-core__surface">
        <span className="mission-core__icon">
          <Orbit size={25} />
        </span>
        <small>Project planet</small>
        <strong title={projectName}>{projectName}</strong>
      </span>
    </div>
  );
}
