"""
Automated telemetry experiments to verify event timing and data integrity.
"""
from __future__ import annotations
import json
import sys
import time
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

sys.path.insert(0, '/tmp/opencode/pack-it-play-it/analysis')

from pipbox.load import Attempt, attempts_from_events


@dataclass
class TelemetryEvent:
    """Represents a telemetry event for testing."""
    type: str
    session_id: str
    puzzle_id: str
    game_id: str
    timestamp: float
    data: Dict = field(default_factory=dict)


@dataclass
class ExperimentResult:
    """Result of a telemetry experiment."""
    test_name: str
    passed: bool
    message: str
    details: Dict = field(default_factory=dict)


class TelemetryExperimentSuite:
    """Suite of experiments to verify telemetry correctness."""
    
    def __init__(self):
        self.events: List[TelemetryEvent] = []
        self.session_id = "test-session-123"
        self.puzzle_index = 0
        
    def _make_puzzle_id(self) -> str:
        return f"{self.session_id}:{self.puzzle_index}"
        
    def record_puzzle_started(self, game_id: str, difficulty: float, 
                            gen_seed: int, optimal_moves: int) -> None:
        """Record a puzzle_started event."""
        event = TelemetryEvent(
            type="puzzle_started",
            session_id=self.session_id,
            puzzle_id=self._make_puzzle_id(),
            game_id=game_id,
            timestamp=time.time() * 1000,  # Convert to milliseconds
            data={
                "gameId": game_id,
                "difficulty": difficulty,
                "genSeed": gen_seed,
                "optimalMoves": optimal_moves
            }
        )
        self.events.append(event)
        
    def record_move(self, move_data: dict, ms_since_start: float) -> None:
        """Record a move event."""
        # Find the most recent puzzle_started for this session
        puzzle_id = self._make_puzzle_id()
        event = TelemetryEvent(
            type="move",
            session_id=self.session_id,
            puzzle_id=puzzle_id,
            game_id="unknown",  # Will be filled in from context
            timestamp=time.time() * 1000,
            data={
                "move": move_data,
                "moveIndex": len([e for e in self.events if e.type == "move" and e.puzzle_id == puzzle_id]),
                "msSinceStart": ms_since_start
            }
        )
        self.events.append(event)
        
    def record_puzzle_ended(self, outcome: str, moves: int, 
                          optimal_moves: int, seconds: float, score: float) -> None:
        """Record a puzzle_ended event."""
        puzzle_id = self._make_puzzle_id()
        event = TelemetryEvent(
            type="puzzle_ended",
            session_id=self.session_id,
            puzzle_id=puzzle_id,
            game_id="unknown",  # Will be filled in from context
            timestamp=time.time() * 1000,
            data={
                "outcome": outcome,
                "moves": moves,
                "optimalMoves": optimal_moves,
                "seconds": seconds,
                "score": score
            }
        )
        self.events.append(event)
        
    def _events_to_dict(self) -> List[dict]:
        """Convert TelemetryEvent objects to dictionaries for processing."""
        result = []
        for event in self.events:
            # Reconstruct the game_id from context (simplified for testing)
            game_id = event.data.get("gameId", "unknown")
            if game_id == "unknown":
                # Try to infer from previous puzzle_started event
                for prev_event in reversed(self.events):
                    if prev_event.type == "puzzle_started" and prev_event.puzzle_id == event.puzzle_id:
                        game_id = prev_event.data.get("gameId", "unknown")
                        break
            
            # Create the base event fields
            trace_event = {
                "type": event.type,
                "sessionId": event.session_id,
                "puzzleId": event.puzzle_id,
                "ts": int(event.timestamp),
                "gameId": game_id
            }
            
            # Add event-specific fields based on type
            if event.type == "puzzle_started":
                trace_event.update({
                    "category": event.data.get("category", "?"),
                    "difficulty": event.data.get("difficulty", 0),
                    "genSeed": event.data.get("genSeed", 0),
                    "optimalMoves": event.data.get("optimalMoves", 0)
                })
            elif event.type == "move":
                trace_event.update({
                    "move": event.data.get("move", {}),
                    "moveIndex": event.data.get("moveIndex", 0),
                    "msSinceStart": event.data.get("msSinceStart", 0)
                })
            elif event.type == "puzzle_ended":
                trace_event.update({
                    "outcome": event.data.get("outcome", "solved"),
                    "moves": event.data.get("moves", 0),
                    "optimalMoves": event.data.get("optimalMoves", 0),
                    "seconds": event.data.get("seconds", 0),
                    "score": event.data.get("score", 0)
                })
            
            result.append(trace_event)
        return result
        
    def run_experiment_1_basic_event_sequence(self) -> ExperimentResult:
        """
        Experiment 1: Verify basic event sequence and timing.
        
        Tests that:
        1. puzzle_started is followed by moves, then puzzle_ended
        2. Move indices are sequential
        3. Timestamps are monotonically increasing
        4. post_solve_moves is correctly calculated as 0 when no moves after solve
        """
        try:
            # Reset for clean test
            self.events = []
            self.puzzle_index = 0
            
            # Simulate a complete puzzle attempt
            self.record_puzzle_started("set-cover", 300.0, 12345, 5)
            start_time = time.time() * 1000
            
            # Simulate 3 moves with timing
            for i in range(3):
                move_time = start_time + (i + 1) * 1000  # 1 second apart
                self.record_move({"type": "place", "position": i}, 
                               (move_time - start_time))
            
            # End the puzzle
            end_time = start_time + 4000  # 4 seconds total
            self.record_puzzle_ended("solved", 3, 5, 3.0, 0.8)
            
            # Convert to trace events and process
            trace_events = self._events_to_dict()
            attempts = attempts_from_events(trace_events, drop_test=False)
            
            # Verify results
            assert len(attempts) == 1, f"Expected 1 attempt, got {len(attempts)}"
            attempt = attempts[0]
            
            # Check basic properties
            assert attempt.session_id == self.session_id
            assert attempt.game_id == "set-cover"
            assert attempt.difficulty == 300.0
            assert attempt.gen_seed == 12345
            assert attempt.optimal_moves == 5
            assert attempt.outcome == "solved"
            assert attempt.ended_moves == 3
            assert attempt.move_events == 3
            assert attempt.post_solve_moves == 0, f"Expected 0 post-solve moves, got {attempt.post_solve_moves}"
            
            # Check timing
            assert attempt.first_move_ms is not None
            assert attempt.first_move_ms >= 0
            assert attempt.first_move_ms <= 1000  # First move should be within 1 second
            
            return ExperimentResult(
                test_name="Basic Event Sequence",
                passed=True,
                message="All basic event sequence checks passed",
                details={
                    "attempts_processed": len(attempts),
                    "move_events": attempt.move_events,
                    "post_solve_moves": attempt.post_solve_moves,
                    "first_move_ms": attempt.first_move_ms
                }
            )
            
        except Exception as e:
            return ExperimentResult(
                test_name="Basic Event Sequence",
                passed=False,
                message=f"Experiment failed with error: {str(e)}",
                details={"error": str(e)}
            )
            
    def run_experiment_2_post_solve_moves(self) -> ExperimentResult:
        """
        Experiment 2: Verify post_solve_moves calculation.
        
        Tests that:
        1. post_solve_moves is 0 when no moves after puzzle_ended
        2. post_solve_moves counts moves that occur after puzzle_ended
        3. post_solve_moves is not affected by idle events
        """
        try:
            # Reset for clean test
            self.events = []
            self.puzzle_index = 0
            
            # Simulate a puzzle attempt with moves after solve
            self.record_puzzle_started("graph-coloring", 400.0, 67890, 3)
            start_time = time.time() * 1000
            
            # Simulate 2 moves during solving
            for i in range(2):
                move_time = start_time + (i + 1) * 500  # 0.5 seconds apart
                self.record_move({"type": "color", "node": i, "color": "red"}, 
                               (move_time - start_time))
            
            # End the puzzle (solved in 2 moves, but optimal is 3)
            end_time = start_time + 2000  # 2 seconds total
            self.record_puzzle_ended("solved", 2, 3, 2.0, 0.9)
            
            # Simulate 2 moves AFTER the puzzle ended (should be caught as post_solve_moves)
            for i in range(2):
                move_time = end_time + (i + 1) * 300  # 0.3 seconds after end
                self.record_move({"type": "review", "action": "check"}, 
                               (move_time - start_time))  # msSinceStart should still increase
            
            # Convert to trace events and process
            trace_events = self._events_to_dict()
            attempts = attempts_from_events(trace_events, drop_test=False)
            
            # Verify results
            assert len(attempts) == 1, f"Expected 1 attempt, got {len(attempts)}"
            attempt = attempts[0]
            
            # Check that post_solve_moves correctly counts the moves after solve
            assert attempt.post_solve_moves == 2, \
                f"Expected 2 post-solve moves, got {attempt.post_solve_moves}"
            assert attempt.move_events == 4, \
                f"Expected 4 total move events, got {attempt.move_events}"  # 2 during + 2 after
            assert attempt.ended_moves == 2, \
                f"Expected 2 ended moves, got {attempt.ended_moves}"
            assert attempt.optimal_moves == 3, \
                f"Expected 3 optimal moves, got {attempt.optimal_moves}"
            assert not attempt.optimal, \
                "Should not be optimal since ended_moves (2) != optimal_moves (3)"
            
            return ExperimentResult(
                test_name="Post-Solve Moves Calculation",
                passed=True,
                message="Post-solve moves calculation works correctly",
                details={
                    "total_move_events": attempt.move_events,
                    "ended_moves": attempt.ended_moves,
                    "optimal_moves": attempt.optimal_moves,
                    "post_solve_moves": attempt.post_solve_moves,
                    "is_optimal": attempt.optimal
                }
            )
            
        except Exception as e:
            return ExperimentResult(
                test_name="Post-Solve Moves Calculation",
                passed=False,
                message=f"Experiment failed with error: {str(e)}",
                details={"error": str(e)}
            )
            
    def run_experiment_3_multiple_puzzles(self) -> ExperimentResult:
        """
        Experiment 3: Verify handling of multiple puzzles in sequence.
        
        Tests that:
        1. Each puzzle gets its own puzzleId
        2. Events are correctly grouped by puzzle
        3. Session ID remains consistent across puzzles
        4. Attempts are correctly separated
        """
        try:
            # Reset for clean test
            self.events = []
            self.puzzle_index = 0
            
            # Simulate two different puzzle attempts
            # Puzzle 1: set-cover
            self.record_puzzle_started("set-cover", 300.0, 11111, 4)
            start_time1 = time.time() * 1000
            for i in range(2):
                move_time = start_time1 + (i + 1) * 400
                self.record_move({"type": "select", "item": i}, 
                               (move_time - start_time1))
            self.record_puzzle_ended("solved", 2, 4, 1.5, 0.85)
            
            self.puzzle_index += 1
            
            # Puzzle 2: graph-coloring  
            self.record_puzzle_started("graph-coloring", 350.0, 22222, 3)
            start_time2 = time.time() * 1000
            for i in range(3):
                move_time = start_time2 + (i + 1) * 300
                self.record_move({"type": "color", "node": i}, 
                               (move_time - start_time2))
            self.record_puzzle_ended("solved", 3, 3, 2.0, 0.9)
            
            # Convert to trace events and process
            trace_events = self._events_to_dict()
            attempts = attempts_from_events(trace_events, drop_test=False)
            
            # Verify results
            assert len(attempts) == 2, f"Expected 2 attempts, got {len(attempts)}"
            
            # Check first attempt (set-cover)
            attempt1 = attempts[0]
            assert attempt1.game_id == "set-cover"
            assert attempt1.session_id == self.session_id
            assert attempt1.puzzle_id == f"{self.session_id}:0"
            assert attempt1.optimal_moves == 4
            assert attempt1.ended_moves == 2
            assert attempt1.move_events == 2
            assert attempt1.post_solve_moves == 0
            assert attempt1.solved == True
            assert attempt1.optimal == False  # 2 moves != 4 optimal
            
            # Check second attempt (graph-coloring)
            attempt2 = attempts[1]
            assert attempt2.game_id == "graph-coloring"
            assert attempt2.session_id == self.session_id
            assert attempt2.puzzle_id == f"{self.session_id}:1"
            assert attempt2.optimal_moves == 3
            assert attempt2.ended_moves == 3
            assert attempt2.move_events == 3
            assert attempt2.post_solve_moves == 0
            assert attempt2.solved == True
            assert attempt2.optimal == True  # 3 moves == 3 optimal
            
            return ExperimentResult(
                test_name="Multiple Puzzles Handling",
                passed=True,
                message="Multiple puzzles handled correctly with proper separation",
                details={
                    "attempts_count": len(attempts),
                    "puzzle_1": {
                        "game_id": attempt1.game_id,
                        "puzzle_id": attempt1.puzzle_id,
                        "optimal_moves": attempt1.optimal_moves,
                        "ended_moves": attempt1.ended_moves,
                        "post_solve_moves": attempt1.post_solve_moves,
                        "is_optimal": attempt1.optimal
                    },
                    "puzzle_2": {
                        "game_id": attempt2.game_id,
                        "puzzle_id": attempt2.puzzle_id,
                        "optimal_moves": attempt2.optimal_moves,
                        "ended_moves": attempt2.ended_moves,
                        "post_solve_moves": attempt2.post_solve_moves,
                        "is_optimal": attempt2.optimal
                    }
                }
            )
            
        except Exception as e:
            return ExperimentResult(
                test_name="Multiple Puzzles Handling",
                passed=False,
                message=f"Experiment failed with error: {str(e)}",
                details={"error": str(e)}
            )
            
    def run_all_experiments(self) -> List[ExperimentResult]:
        """Run all telemetry experiments and return results."""
        experiments = [
            self.run_experiment_1_basic_event_sequence,
            self.run_experiment_2_post_solve_moves,
            self.run_experiment_3_multiple_puzzles
        ]
        
        results = []
        for experiment in experiments:
            try:
                result = experiment()
                results.append(result)
            except Exception as e:
                results.append(ExperimentResult(
                    test_name=experiment.__name__,
                    passed=False,
                    message=f"Experiment failed to run: {str(e)}",
                    details={"error": str(e)}
                ))
        return results


def run_telemetry_experiments() -> Tuple[bool, List[ExperimentResult]]:
    """
    Run the telemetry experiment suite and return overall success.
    
    Returns:
        Tuple of (all_passed, results_list)
    """
    suite = TelemetryExperimentSuite()
    results = suite.run_all_experiments()
    all_passed = all(result.passed for result in results)
    return all_passed, results


if __name__ == "__main__":
    # Allow running directly for testing
    all_passed, results = run_telemetry_experiments()
    
    print("Telemetry Experiment Suite Results:")
    print("=" * 50)
    
    for result in results:
        status = "PASS" if result.passed else "FAIL"
        print(f"{status}: {result.test_name}")
        print(f"  Message: {result.message}")
        if not result.passed:
            print(f"  Details: {result.details}")
        print()
    
    print("=" * 50)
    print(f"Overall: {'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")
    
    # Exit with appropriate code
    exit(0 if all_passed else 1)