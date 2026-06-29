#!/usr/bin/env python3
"""pipbox CLI — run the analysis suite over a traces JSONL export.

  python3 analysis/analyze.py traces.jsonl              # game health report
  python3 analysis/analyze.py traces.jsonl --md out.md  # write report to file
  python3 analysis/analyze.py traces.jsonl --keep-test  # include manual test rows

Pull live data first:
  curl -s https://pip-ingest.tail7a0e03.ts.net/export > traces.jsonl
"""
import argparse
import sys
from pipbox.load import load_attempts
from pipbox.report import per_game, render_markdown


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("jsonl")
    p.add_argument("--md", help="write markdown report to this path")
    p.add_argument("--keep-test", action="store_true", help="include manual test sessions")
    args = p.parse_args(argv)

    attempts = load_attempts(args.jsonl, drop_test=not args.keep_test)
    if not attempts:
        print("no attempts found", file=sys.stderr)
        return 1
    md = render_markdown(per_game(attempts))
    if args.md:
        with open(args.md, "w", encoding="utf-8") as f:
            f.write(md + "\n")
        print(f"wrote {args.md} ({len(attempts)} attempts)")
    else:
        print(md)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
