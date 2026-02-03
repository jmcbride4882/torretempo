import express from "express";
import request from "supertest";
import timeEntryRoutes from "../timeEntry.routes";
import { TimeEntryError } from "../../services/timeEntry.service";

jest.mock("../../services/timeEntry.service", () => {
  const actual = jest.requireActual("../../services/timeEntry.service");
  const mockClockIn = jest.fn();
  const mockClockOut = jest.fn();
  const mockGetCurrent = jest.fn();
  const mockGetHistory = jest.fn();
  const mockGetStats = jest.fn();
  const mockGetEmployeeForUser = jest.fn();

  return {
    ...actual,
    TimeEntryService: jest.fn().mockImplementation(() => ({
      clockIn: mockClockIn,
      clockOut: mockClockOut,
      getCurrent: mockGetCurrent,
      getHistory: mockGetHistory,
      getStats: mockGetStats,
      getEmployeeForUser: mockGetEmployeeForUser,
    })),
    __mocks: {
      mockClockIn,
      mockClockOut,
      mockGetCurrent,
      mockGetHistory,
      mockGetStats,
      mockGetEmployeeForUser,
    },
  };
});

const serviceMocks = jest.requireMock("../../services/timeEntry.service")
  .__mocks as {
  mockClockIn: jest.Mock;
  mockClockOut: jest.Mock;
  mockGetCurrent: jest.Mock;
  mockGetHistory: jest.Mock;
  mockGetStats: jest.Mock;
  mockGetEmployeeForUser: jest.Mock;
};

function buildApp(role: string = "employee") {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).tenantId = "tenant-1";
    (req as any).user = {
      userId: "user-1",
      email: "user@example.com",
      role,
    };
    next();
  });
  app.use("/time-entries", timeEntryRoutes);
  return app;
}

describe("Time Entry Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("POST /time-entries/clock-in returns created entry", async () => {
    serviceMocks.mockClockIn.mockResolvedValue({
      id: "entry-1",
      employeeId: "emp-1",
      clockIn: new Date("2026-02-03T08:00:00Z"),
      clockOut: null,
      shiftId: null,
      entryType: "unscheduled",
      clockInLat: 1,
      clockInLng: 2,
      status: "active",
      breakMinutes: 0,
      totalHours: null,
      overtimeHours: null,
      createdAt: new Date("2026-02-03T08:00:00Z"),
    });

    const app = buildApp();
    const response = await request(app)
      .post("/time-entries/clock-in")
      .send({ notes: "start" });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBe("entry-1");
  });

  it("POST /time-entries/clock-in returns domain error", async () => {
    serviceMocks.mockClockIn.mockRejectedValue(
      new TimeEntryError("ALREADY_CLOCKED_IN", "Already clocked in", 400, {
        currentEntry: {
          id: "entry-1",
          clockIn: new Date("2026-02-03T08:00:00Z"),
          shiftId: null,
        },
      }),
    );

    const app = buildApp();
    const response = await request(app).post("/time-entries/clock-in").send({});

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("ALREADY_CLOCKED_IN");
  });

  it("POST /time-entries/clock-out returns updated entry", async () => {
    serviceMocks.mockClockOut.mockResolvedValue({
      id: "entry-1",
      employeeId: "emp-1",
      clockIn: new Date("2026-02-03T08:00:00Z"),
      clockOut: new Date("2026-02-03T16:00:00Z"),
      shiftId: null,
      entryType: "unscheduled",
      clockInLat: 1,
      clockInLng: 2,
      clockOutLat: 1,
      clockOutLng: 2,
      breakMinutes: 30,
      totalHours: 7.5,
      overtimeHours: 0,
      status: "active",
      notes: null,
      createdAt: new Date("2026-02-03T08:00:00Z"),
      updatedAt: new Date("2026-02-03T16:00:00Z"),
    });

    const app = buildApp();
    const response = await request(app)
      .post("/time-entries/clock-out")
      .send({ breakMinutes: 30 });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.clockOut).toBeTruthy();
  });

  it("GET /time-entries/current returns active entry", async () => {
    serviceMocks.mockGetCurrent.mockResolvedValue({
      id: "entry-1",
      employeeId: "emp-1",
      clockIn: new Date("2026-02-03T08:00:00Z"),
      clockOut: null,
      shiftId: null,
      entryType: "unscheduled",
      clockInLat: 1,
      clockInLng: 2,
      breakMinutes: 0,
      totalHours: null,
      overtimeHours: null,
      status: "active",
      createdAt: new Date("2026-02-03T08:00:00Z"),
      elapsedMinutes: 30,
      shift: null,
    });

    const app = buildApp();
    const response = await request(app).get("/time-entries/current");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.elapsedMinutes).toBe(30);
  });

  it("GET /time-entries returns history payload", async () => {
    serviceMocks.mockGetEmployeeForUser.mockResolvedValue({ id: "emp-1" });
    serviceMocks.mockGetHistory.mockResolvedValue({
      entries: [],
      pagination: {
        page: 1,
        limit: 50,
        totalItems: 0,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    });

    const app = buildApp();
    const response = await request(app).get("/time-entries?page=1");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.pagination.page).toBe(1);
  });

  it("GET /time-entries rejects employeeId for employee role", async () => {
    const app = buildApp();
    const response = await request(app).get(
      "/time-entries?employeeId=00000000-0000-0000-0000-000000000000",
    );

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("FORBIDDEN");
  });

  it("GET /time-entries/stats returns stats", async () => {
    serviceMocks.mockGetEmployeeForUser.mockResolvedValue({ id: "emp-1" });
    serviceMocks.mockGetStats.mockResolvedValue({
      totalHours: 8,
      regularHours: 8,
      overtimeHours: 0,
      breakHours: 0.5,
      totalDays: 1,
      daysWorked: 1,
      scheduledShifts: 1,
      unscheduledShifts: 0,
      missingClockOuts: 0,
      averageHoursPerDay: 8,
    });

    const app = buildApp();
    const response = await request(app).get(
      "/time-entries/stats?startDate=2026-02-01T00:00:00Z&endDate=2026-02-01T23:59:59Z",
    );

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.totalHours).toBe(8);
  });

  it("GET /time-entries/stats rejects employeeId for employee role", async () => {
    const app = buildApp();
    const response = await request(app).get(
      "/time-entries/stats?startDate=2026-02-01T00:00:00Z&endDate=2026-02-01T23:59:59Z&employeeId=00000000-0000-0000-0000-000000000000",
    );

    expect(response.status).toBe(403);
    expect(response.body.code).toBe("FORBIDDEN");
  });
});
