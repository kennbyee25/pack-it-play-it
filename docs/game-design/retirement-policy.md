# Game Retirement Policy

## Purpose

This policy defines criteria and procedures for retiring games from the Pack-it-Play-it active rotation. Retired games are no longer served to new players but may remain accessible for existing players who have previously played them.

## Retirement Criteria

A game may be considered for retirement if it meets one or more of the following conditions:

1. **Low Engagement**: The game has consistently low play counts over a significant period (e.g., less than 5 plays per week for 4 consecutive weeks).
2. **High Difficulty**: The game's success rate is significantly below the threshold for enjoyable gameplay (e.g., less than 10% success rate over 100 plays).
3. **Negative Feedback**: The game receives consistently negative player feedback (e.g., average rating below 2.0/5.0) or frequent reports of frustration.
4. **Technical Debt**: The game's codebase is overly complex, poorly maintained, or causes frequent bugs that impact the overall platform stability.
5. **Strategic Shift**: The game no longer aligns with the platform's educational or entertainment goals.
6. **Duplicate or Superior Alternative**: A similar game exists that provides a better player experience, making the current game redundant.

## Retirement Process

1. **Proposal**: Any team member can propose a game for retirement by creating an issue in the project tracker with the label `game-retirement` and providing evidence based on the criteria above.
2. **Review**: The proposal is reviewed by the game design team. A decision is made within one week.
3. **Notification**: If approved, the game is marked for retirement. Players who have an active session are allowed to finish, but new sessions will not be served the game.
4. **Documentation**: The retirement is documented in this policy document, including the date, reasons, and any relevant metrics.
5. **Archival**: The game's code and assets remain in the repository but are excluded from the active game list via configuration (see game configuration update procedure).

## Documentation

Each retired game should have an entry in this document with the following format:

### [Game ID] - [Game Name]

- **Retired on**: YYYY-MM-DD
- **Primary reason**: [e.g., Low Engagement]
- **Metrics at retirement**:
  - Play count (last 30 days): [number]
  - Success rate: [percentage]
  - Average rating: [score/5.0]
- **Notes**: [Any additional context]

## Examples

*(Examples will be added as games are retired.)*

## Reconsideration

A retired game can be reconsidered for reactivation if significant improvements are made or if player demand changes. The process for reactivation follows the same review process as a new game proposal.

---
*This policy is subject to change as the platform evolves.*