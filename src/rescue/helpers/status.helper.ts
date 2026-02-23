import { RescueStatus, AssignmentStatus, RescuePriority } from '@/database/entities';

export class RescueStatusTransition {
  private static readonly transitions: Record<RescueStatus, RescueStatus[]> = {
    [RescueStatus.NEW]: [
      RescueStatus.REVIEWED,
      RescueStatus.CANCELED,
    ],
    [RescueStatus.REVIEWED]: [
      RescueStatus.ASSIGNED,
      RescueStatus.CANCELED,
    ],
    [RescueStatus.ASSIGNED]: [
      RescueStatus.ACCEPTED,
      RescueStatus.REJECTED,
      RescueStatus.CANCELED,
    ],
    [RescueStatus.ACCEPTED]: [
      RescueStatus.IN_PROGRESS,
      RescueStatus.CANCELED,
    ],
    [RescueStatus.IN_PROGRESS]: [
      RescueStatus.DONE,
      RescueStatus.CANCELED,
    ],
    [RescueStatus.DONE]: [],
    [RescueStatus.CANCELED]: [],
    [RescueStatus.REJECTED]: [],
  };

  static isValidTransition(from: RescueStatus, to: RescueStatus): boolean {
    return this.transitions[from]?.includes(to) ?? false;
  }

  static canUserCancel(status: RescueStatus): boolean {
    return status === RescueStatus.NEW || status === RescueStatus.REVIEWED;
  }
}

export class AssignmentStatusTransition {
  private static readonly transitions: Record<
    AssignmentStatus,
    AssignmentStatus[]
  > = {
    [AssignmentStatus.SENT]: [
      AssignmentStatus.ACCEPTED,
      AssignmentStatus.DECLINED,
      AssignmentStatus.CANCELED,
    ],
    [AssignmentStatus.ACCEPTED]: [
      AssignmentStatus.CANCELED,
    ],
    [AssignmentStatus.DECLINED]: [],
    [AssignmentStatus.CANCELED]: [],
  };

  static isValidTransition(
    from: AssignmentStatus,
    to: AssignmentStatus,
  ): boolean {
    return this.transitions[from]?.includes(to) ?? false;
  }
}
