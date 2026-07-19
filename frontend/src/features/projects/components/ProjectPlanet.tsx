import { Orbit } from "lucide-react";

interface ProjectPlanetProps {
  projectName: string;
}

export function ProjectPlanet({ projectName }: ProjectPlanetProps) {
  return (
    <div className="mission-core" aria-label={`Project core: ${projectName}`}>
      <span aria-hidden="true" className="mission-core__ring mission-core__ring--outer" />
      <span aria-hidden="true" className="mission-core__ring mission-core__ring--inner" />
      <span className="mission-core__icon">
        <Orbit size={26} />
      </span>
      <small>Project core</small>
      <strong title={projectName}>{projectName}</strong>
    </div>
  );
}
