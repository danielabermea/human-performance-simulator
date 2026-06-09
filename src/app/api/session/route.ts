import { initializeSimulationSession } from "@/lib/simulation/clientSession";

export async function POST() {
  const simulationSession = initializeSimulationSession();
  return Response.json(simulationSession);
}
