// Simple in-memory counter for demo purposes
let gameLoadCount = 0;

export const GET = (): Response => {
  // Increment the counter (in a real app, this would be done when a game is loaded)
  gameLoadCount += 1;
  
  // Return Prometheus-formatted metrics
  const metrics = `
# HELP game_load_count Number of times a game has been loaded
# TYPE game_load_count counter
game_load_count ${gameLoadCount}
`.trim();

  return new Response(metrics, {
    headers: {
      'Content-Type': 'text/plain; version=0.0.4',
    },
  });
};
