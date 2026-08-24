"""
Automated test bed for telemetry correctness.
Runs all telemetry experiments and reports results.
"""
import sys
import os
from telemetry_experiments import run_telemetry_experiments

def run_telemetry_test_bed():
    """
    Run the telemetry test bed and return results.
    
    Returns:
        Tuple of (overall_success, results_list)
    """
    # Add the current directory to the path so we can import telemetry_experiments
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    
    # Run the telemetry experiments
    all_passed, results = run_telemetry_experiments()
    
    return all_passed, results

def main():
    """Main function to run the test bed and print results."""
    print("Telemetry Test Bed")
    print("=" * 50)
    
    all_passed, results = run_telemetry_test_bed()
    
    for result in results:
        status = "PASS" if result.passed else "FAIL"
        print(f"{status}: {result.test_name}")
        print(f"  Message: {result.message}")
        if not result.passed:
            print(f"  Details: {result.details}")
        print()
    
    print("=" * 50)
    print(f"Overall: {'ALL TESTS PASSED' if all_passed else 'SOME TESTS FAILED'}")
    
    # Return appropriate exit code
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())