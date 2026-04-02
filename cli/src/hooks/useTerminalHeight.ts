import { useState, useEffect } from "react";
import { useStdout } from "ink";

/**
 * Returns the number of terminal rows available for a scrollable list,
 * subtracting fixed chrome (status bar + panel header).
 */
export function useListLimit(overhead = 5): number {
  const { stdout } = useStdout();
  const [rows, setRows] = useState(stdout.rows ?? 24);

  useEffect(() => {
    const handler = () => setRows(stdout.rows ?? 24);
    stdout.on("resize", handler);
    return () => {
      stdout.off("resize", handler);
    };
  }, [stdout]);

  return Math.max(5, rows - overhead);
}
