interface Conflict {
  type: string;
  severity: "error" | "warning" | "info";
  message: string;
  conflictingShiftId?: string;
}

interface Shift {
  id: string;
  startTime: Date;
  endTime: Date;
  breakMinutes: number;
  employeeId: string | null;
}

export class ConflictDetectionService {
  /**
   * Detect all conflicts for a given shift
   * Phase 1: Only implements overlap detection
   */
  detectConflicts(shift: Shift, allEmployeeShifts: Shift[]): Conflict[] {
    const conflicts: Conflict[] = [];

    // Only check for overlaps in Phase 1
    const overlapConflict = this.detectOverlap(shift, allEmployeeShifts);
    if (overlapConflict) {
      conflicts.push(overlapConflict);
    }

    // TODO Phase 2: Add rest period validation (11-hour rule)
    // TODO Phase 2: Add max hours validation
    // TODO Phase 2: Add availability validation

    return conflicts;
  }

  /**
   * Detect overlapping shifts for the same employee
   */
  private detectOverlap(shift: Shift, allShifts: Shift[]): Conflict | null {
    if (!shift.employeeId) {
      return null; // Unassigned shifts can't have conflicts
    }

    // Filter to other shifts for same employee
    const otherShifts = allShifts.filter(
      (s) => s.id !== shift.id && s.employeeId === shift.employeeId,
    );

    for (const other of otherShifts) {
      // Check if time ranges overlap
      // Overlap condition: shift.start < other.end AND shift.end > other.start
      if (shift.startTime < other.endTime && shift.endTime > other.startTime) {
        const formatTime = (date: Date) => {
          return date.toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          });
        };

        const formatDate = (date: Date) => {
          return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
          });
        };

        return {
          type: "overlap",
          severity: "error",
          message: `Overlaps with shift on ${formatDate(other.startTime)} ${formatTime(other.startTime)} - ${formatTime(other.endTime)}`,
          conflictingShiftId: other.id,
        };
      }
    }

    return null;
  }

  /**
   * Detect rest period violations (Spanish law: 11-hour minimum rest)
   * TODO: Implement in Phase 2
   */
  private detectRestPeriodViolation(
    shift: Shift,
    allShifts: Shift[],
  ): Conflict | null {
    // Phase 2 implementation
    return null;
  }

  /**
   * Detect max hours violations
   * TODO: Implement in Phase 2
   */
  private detectMaxHoursViolation(
    shift: Shift,
    allShifts: Shift[],
  ): Conflict | null {
    // Phase 2 implementation
    return null;
  }

  /**
   * Detect availability violations
   * TODO: Implement in Phase 2 (requires employee availability data)
   */
  private detectAvailabilityViolation(shift: Shift): Conflict | null {
    // Phase 2 implementation
    return null;
  }
}
