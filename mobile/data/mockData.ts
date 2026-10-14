/**
 * data/mockData.ts — Realistic fictional demo data for CraftRelay Part 2.
 *
 * Every screen that needs data pulls from here. No backend calls are made.
 * Part 3 will replace these with real API calls.
 */

import type {
  User,
  WorkerProfile,
  Skill,
  Qualification,
  Assessment,
  Evidence,
  ServiceRequest,
  Review,
  AdminStats,
  AuditLog,
  AssessmentTask,
} from "../types/domain";

// ── Users ─────────────────────────────────────────────────────────────────────

export const MOCK_USERS: User[] = [
  {
    id: "u1",
    name: "Rajan Mehta",
    email: "rajan.mehta@example.com",
    phone: "+91 98765 43210",
    role: "worker",
    createdAt: "2025-03-12T09:00:00Z",
    isActive: true,
  },
  {
    id: "u2",
    name: "Priya Sharma",
    email: "priya.sharma@example.com",
    phone: "+91 87654 32109",
    role: "worker",
    createdAt: "2025-04-01T10:30:00Z",
    isActive: true,
  },
  {
    id: "u3",
    name: "Arun Kumar",
    email: "arun.kumar@example.com",
    phone: "+91 76543 21098",
    role: "worker",
    createdAt: "2025-05-20T11:00:00Z",
    isActive: true,
  },
  {
    id: "u4",
    name: "Deepa Nair",
    email: "deepa.nair@example.com",
    phone: "+91 65432 10987",
    role: "assessor",
    createdAt: "2025-02-01T08:00:00Z",
    isActive: true,
  },
  {
    id: "u5",
    name: "Suresh Patel",
    email: "suresh.patel@example.com",
    phone: "+91 54321 09876",
    role: "assessor",
    createdAt: "2025-01-15T08:30:00Z",
    isActive: true,
  },
  {
    id: "u6",
    name: "Kavitha Rao",
    email: "kavitha.rao@example.com",
    phone: "+91 43210 98765",
    role: "customer",
    createdAt: "2025-06-01T14:00:00Z",
    isActive: true,
  },
  {
    id: "u7",
    name: "Manish Joshi",
    email: "manish.joshi@example.com",
    phone: "+91 32109 87654",
    role: "customer",
    createdAt: "2025-06-10T15:00:00Z",
    isActive: true,
  },
  {
    id: "u8",
    name: "Admin User",
    email: "admin@craftrelay.in",
    phone: "+91 11111 22222",
    role: "admin",
    createdAt: "2025-01-01T00:00:00Z",
    isActive: true,
  },
];

export const MOCK_WORKER_USER = MOCK_USERS[0]!;
export const MOCK_ASSESSOR_USER = MOCK_USERS[3]!;
export const MOCK_CUSTOMER_USER = MOCK_USERS[5]!;
export const MOCK_ADMIN_USER = MOCK_USERS[7]!;

// ── Skills ────────────────────────────────────────────────────────────────────

export const MOCK_SKILLS: Skill[] = [
  {
    id: "s1",
    name: "Electrical Wiring",
    category: "Electrical",
    description: "Residential and commercial electrical installation and repair.",
  },
  {
    id: "s2",
    name: "Plumbing",
    category: "Plumbing",
    description: "Water supply, drainage, and fixture installation.",
  },
  {
    id: "s3",
    name: "Carpentry",
    category: "Woodwork",
    description: "Furniture making, wood fitting, and structural carpentry.",
  },
  {
    id: "s4",
    name: "AC Repair & Maintenance",
    category: "HVAC",
    description: "Air conditioner servicing, gas refill, and fault diagnosis.",
  },
  {
    id: "s5",
    name: "Painting & Coating",
    category: "Finishing",
    description: "Interior and exterior painting, wall textures, and coatings.",
  },
  {
    id: "s6",
    name: "Welding",
    category: "Metal Works",
    description: "Arc and MIG welding for fabrication and repair.",
  },
  {
    id: "s7",
    name: "Masonry",
    category: "Construction",
    description: "Brick, block, and stone construction and repair.",
  },
  {
    id: "s8",
    name: "Tiling",
    category: "Finishing",
    description: "Floor and wall tile installation and grouting.",
  },
];

// ── Qualifications ────────────────────────────────────────────────────────────

export const MOCK_QUALIFICATIONS: Qualification[] = [
  {
    id: "q1",
    title: "Residential Electrician — Level 2",
    skill: MOCK_SKILLS[0]!,
    level: "intermediate",
    issuedBy: "NSDC / NIELIT",
    validityMonths: 36,
    criteria: [
      {
        id: "c1",
        title: "Safety Compliance",
        description: "Demonstrate knowledge and adherence to IS 732 electrical safety standards.",
        evidenceRequired: ["Certificate photo", "Safety equipment photo"],
        weightage: 25,
      },
      {
        id: "c2",
        title: "Wiring Installation",
        description: "Complete a residential distribution board wiring task within 90 minutes.",
        evidenceRequired: ["Before and after photos", "Video of completed work"],
        weightage: 40,
      },
      {
        id: "c3",
        title: "Fault Diagnosis",
        description: "Identify and correct three simulated faults in a test panel.",
        evidenceRequired: ["Fault identification sheet", "Correction photos"],
        weightage: 35,
      },
    ],
  },
  {
    id: "q2",
    title: "Plumbing Technician — Level 1",
    skill: MOCK_SKILLS[1]!,
    level: "beginner",
    issuedBy: "NSDC",
    validityMonths: 24,
    criteria: [
      {
        id: "c4",
        title: "Pipe Joining & Fitting",
        description: "Demonstrate correct techniques for joining various pipe types.",
        evidenceRequired: ["Photo of completed joint", "Leak test result"],
        weightage: 50,
      },
      {
        id: "c5",
        title: "Fixture Installation",
        description: "Install a wash basin, tap, and P-trap assembly correctly.",
        evidenceRequired: ["Installation photos", "Water flow test video"],
        weightage: 50,
      },
    ],
  },
  {
    id: "q3",
    title: "AC Technician — Level 2",
    skill: MOCK_SKILLS[3]!,
    level: "intermediate",
    issuedBy: "NSDC / HVAC India",
    validityMonths: 36,
    criteria: [
      {
        id: "c6",
        title: "Refrigerant Handling",
        description: "Safe handling and recharging of R-410A refrigerant.",
        evidenceRequired: ["Certification copy", "Equipment photo"],
        weightage: 30,
      },
      {
        id: "c7",
        title: "Service & Maintenance",
        description: "Perform a complete service on a 1.5-ton split AC unit.",
        evidenceRequired: ["Before service report", "After service report", "Photos"],
        weightage: 70,
      },
    ],
  },
];

// ── Evidence ──────────────────────────────────────────────────────────────────

export const MOCK_EVIDENCE: Evidence[] = [
  {
    id: "e1",
    workerId: "u1",
    criterionId: "c1",
    type: "certificate",
    title: "IS 732 Safety Training Certificate",
    description: "Certificate from NIELIT safety training programme, 2024.",
    status: "accepted",
    submittedAt: "2025-07-10T10:00:00Z",
    reviewedAt: "2025-07-15T14:00:00Z",
  },
  {
    id: "e2",
    workerId: "u1",
    criterionId: "c2",
    type: "photo",
    title: "Distribution Board Wiring — Completed",
    description: "Photo showing the completed wiring of a 6-way distribution board.",
    status: "accepted",
    submittedAt: "2025-07-10T10:30:00Z",
    reviewedAt: "2025-07-15T14:05:00Z",
  },
  {
    id: "e3",
    workerId: "u1",
    criterionId: "c3",
    type: "document",
    title: "Fault Diagnosis Sheet",
    description: "Completed fault identification and correction worksheet.",
    status: "submitted",
    submittedAt: "2025-08-01T09:00:00Z",
  },
  {
    id: "e4",
    workerId: "u2",
    criterionId: "c4",
    type: "video",
    title: "Pipe Joint Demonstration",
    description: "Video of CPVC pipe joining and pressure testing.",
    status: "submitted",
    submittedAt: "2025-08-05T11:00:00Z",
  },
  {
    id: "e5",
    workerId: "u2",
    criterionId: "c5",
    type: "photo",
    title: "Wash Basin Installation",
    description: "Completed wash basin installation with running water test.",
    status: "rejected",
    reviewNote: "Water flow test video is missing. Please resubmit with a video showing the tap running.",
    submittedAt: "2025-08-05T11:15:00Z",
    reviewedAt: "2025-08-10T16:00:00Z",
  },
];

// ── Worker Profiles ───────────────────────────────────────────────────────────

export const MOCK_WORKERS: WorkerProfile[] = [
  {
    id: "wp1",
    user: MOCK_USERS[0]!,
    bio: "Experienced electrician with 8 years of residential and light commercial wiring experience. Certified by NIELIT and trained in IS 732 safety standards. Known for clean, code-compliant installations.",
    city: "Bengaluru",
    state: "Karnataka",
    availabilityStatus: "available",
    rating: 4.7,
    reviewCount: 38,
    completedJobs: 112,
    hourlyRate: 450,
    languages: ["Kannada", "Hindi", "English"],
    profileCompleteness: 85,
    skills: [
      {
        id: "ws1",
        skill: MOCK_SKILLS[0]!,
        level: "advanced",
        verificationStatus: "verified",
        yearsExperience: 8,
        verifiedAt: "2025-07-20T00:00:00Z",
      },
      {
        id: "ws2",
        skill: MOCK_SKILLS[5]!,
        level: "intermediate",
        verificationStatus: "pending",
        yearsExperience: 3,
      },
    ],
  },
  {
    id: "wp2",
    user: MOCK_USERS[1]!,
    bio: "Skilled plumber specialising in domestic water supply and drainage. Completed over 200 installations across Pune. Quick response, quality-focused work.",
    city: "Pune",
    state: "Maharashtra",
    availabilityStatus: "available",
    rating: 4.5,
    reviewCount: 62,
    completedJobs: 214,
    hourlyRate: 380,
    languages: ["Marathi", "Hindi"],
    profileCompleteness: 70,
    skills: [
      {
        id: "ws3",
        skill: MOCK_SKILLS[1]!,
        level: "advanced",
        verificationStatus: "verified",
        yearsExperience: 11,
        verifiedAt: "2025-05-10T00:00:00Z",
      },
      {
        id: "ws4",
        skill: MOCK_SKILLS[7]!,
        level: "intermediate",
        verificationStatus: "unverified",
        yearsExperience: 4,
      },
    ],
  },
  {
    id: "wp3",
    user: MOCK_USERS[2]!,
    bio: "AC technician and HVAC specialist. Trained in inverter and non-inverter AC servicing. Covered Hyderabad and surrounding districts for 6 years.",
    city: "Hyderabad",
    state: "Telangana",
    availabilityStatus: "busy",
    rating: 4.3,
    reviewCount: 27,
    completedJobs: 88,
    hourlyRate: 500,
    languages: ["Telugu", "Hindi"],
    profileCompleteness: 60,
    skills: [
      {
        id: "ws5",
        skill: MOCK_SKILLS[3]!,
        level: "intermediate",
        verificationStatus: "pending",
        yearsExperience: 6,
      },
    ],
  },
];

export const MOCK_WORKER_PROFILE = MOCK_WORKERS[0]!;

// ── Assessments ───────────────────────────────────────────────────────────────

export const MOCK_ASSESSMENTS: Assessment[] = [
  {
    id: "a1",
    worker: MOCK_WORKERS[0]!,
    assessor: MOCK_USERS[3]!,
    qualification: MOCK_QUALIFICATIONS[0]!,
    status: "in_progress",
    type: "evidence_review",
    scheduledAt: "2025-08-15T10:00:00Z",
    criterionScores: [
      { criterionId: "c1", score: 23, maxScore: 25, note: "Good knowledge of IS 732." },
      { criterionId: "c2", score: 0, maxScore: 40, note: "" },
    ],
    assessorNotes: "Evidence for criterion 1 is strong. Awaiting fault diagnosis submission.",
    evidence: MOCK_EVIDENCE.filter((e) => e.workerId === "u1"),
  },
  {
    id: "a2",
    worker: MOCK_WORKERS[1]!,
    assessor: MOCK_USERS[3]!,
    qualification: MOCK_QUALIFICATIONS[1]!,
    status: "pending",
    type: "practical_test",
    criterionScores: [],
    assessorNotes: "",
    evidence: MOCK_EVIDENCE.filter((e) => e.workerId === "u2"),
  },
  {
    id: "a3",
    worker: MOCK_WORKERS[2]!,
    assessor: MOCK_USERS[4]!,
    qualification: MOCK_QUALIFICATIONS[2]!,
    status: "completed",
    type: "evidence_review",
    scheduledAt: "2025-07-20T09:00:00Z",
    completedAt: "2025-07-22T15:00:00Z",
    overallScore: 88,
    criterionScores: [
      { criterionId: "c6", score: 28, maxScore: 30, note: "Certification valid and equipment in order." },
      { criterionId: "c7", score: 60, maxScore: 70, note: "Service report comprehensive." },
    ],
    assessorNotes: "All criteria met. Recommend approval.",
    outcome: "pass",
    evidence: [],
  },
];

// ── Assessment Tasks ──────────────────────────────────────────────────────────

export const MOCK_ASSESSMENT_TASKS: AssessmentTask[] = [
  {
    id: "t1",
    title: "Wire a 6-Way Distribution Board",
    description: "Install and wire a 6-way single-phase MCB distribution board from a provided live supply point.",
    instructions: [
      "Wear appropriate PPE before starting.",
      "Identify the live, neutral, and earth conductors.",
      "Install the MCBs and busbar connections.",
      "Connect incoming supply and outgoing circuits.",
      "Label each circuit clearly.",
      "Test with a multimeter before energising.",
    ],
    maxScore: 40,
    timeLimit: 90,
  },
  {
    id: "t2",
    title: "Diagnose Three Simulated Faults",
    description: "Identify and correct three pre-set faults in the test panel within the allotted time.",
    instructions: [
      "Do not power the panel before inspection.",
      "Use only provided tools.",
      "Document each fault found on the provided worksheet.",
      "Correct each fault and test after each correction.",
    ],
    maxScore: 35,
    timeLimit: 60,
  },
];

// ── Service Requests ──────────────────────────────────────────────────────────

export const MOCK_SERVICE_REQUESTS: ServiceRequest[] = [
  {
    id: "sr1",
    customer: MOCK_USERS[5]!,
    worker: MOCK_WORKERS[0]!,
    skill: MOCK_SKILLS[0]!,
    title: "Fix Short Circuit in Living Room",
    description: "Lights in the living room trip the MCB repeatedly. Need an electrician to diagnose and fix it.",
    location: "Koramangala, Bengaluru",
    budget: 800,
    status: "accepted",
    preferredDate: "2025-08-20",
    createdAt: "2025-08-18T09:00:00Z",
    acceptedAt: "2025-08-18T11:00:00Z",
  },
  {
    id: "sr2",
    customer: MOCK_USERS[6]!,
    skill: MOCK_SKILLS[1]!,
    title: "Kitchen Tap Leaking — Urgent",
    description: "Kitchen tap has a persistent drip. Property is rented. Need repair ASAP.",
    location: "Kothrud, Pune",
    budget: 400,
    status: "open",
    preferredDate: "2025-08-21",
    createdAt: "2025-08-18T14:00:00Z",
  },
  {
    id: "sr3",
    customer: MOCK_USERS[5]!,
    worker: MOCK_WORKERS[0]!,
    skill: MOCK_SKILLS[0]!,
    title: "New Power Points in Home Office",
    description: "Need 4 new power outlets installed in a spare bedroom being converted to a home office.",
    location: "HSR Layout, Bengaluru",
    budget: 2500,
    status: "completed",
    preferredDate: "2025-08-10",
    createdAt: "2025-08-08T10:00:00Z",
    acceptedAt: "2025-08-09T08:00:00Z",
    completedAt: "2025-08-10T17:00:00Z",
  },
  {
    id: "sr4",
    customer: MOCK_USERS[6]!,
    skill: MOCK_SKILLS[3]!,
    title: "Split AC Not Cooling",
    description: "1.5-ton LG split AC in bedroom stopped cooling. Installed 3 years ago. Needs service.",
    location: "Banjara Hills, Hyderabad",
    budget: 1200,
    status: "open",
    preferredDate: "2025-08-22",
    createdAt: "2025-08-19T07:30:00Z",
  },
];

// ── Reviews ───────────────────────────────────────────────────────────────────

export const MOCK_REVIEWS: Review[] = [
  {
    id: "r1",
    serviceRequestId: "sr3",
    reviewer: MOCK_USERS[5]!,
    rating: 5,
    comment: "Rajan did an excellent job. Arrived on time, completed the work neatly, and cleaned up afterwards. Highly recommended.",
    createdAt: "2025-08-11T09:00:00Z",
  },
  {
    id: "r2",
    serviceRequestId: "sr3",
    reviewer: MOCK_USERS[5]!,
    rating: 4,
    comment: "Good quality work, clear communication. Took slightly longer than estimated but the result is perfect.",
    createdAt: "2025-07-15T11:00:00Z",
  },
  {
    id: "r3",
    serviceRequestId: "sr1",
    reviewer: MOCK_USERS[5]!,
    rating: 5,
    comment: "Fixed a tricky wiring issue that two others had struggled with. Very professional.",
    createdAt: "2025-06-20T14:00:00Z",
  },
];

// ── Admin Stats ───────────────────────────────────────────────────────────────

export const MOCK_ADMIN_STATS: AdminStats = {
  totalWorkers: 1842,
  verifiedWorkers: 1104,
  totalAssessors: 47,
  totalCustomers: 3291,
  pendingAssessments: 28,
  completedAssessments: 516,
  openServiceRequests: 94,
  completedServiceRequests: 2187,
};

// ── Audit Logs ────────────────────────────────────────────────────────────────

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: "al1",
    actor: MOCK_USERS[3]!,
    action: "assessment.approved",
    resourceType: "Assessment",
    resourceId: "a3",
    details: "AC Technician Level 2 assessment approved with score 88/100.",
    timestamp: "2025-07-22T15:00:00Z",
  },
  {
    id: "al2",
    actor: MOCK_USERS[3]!,
    action: "evidence.rejected",
    resourceType: "Evidence",
    resourceId: "e5",
    details: "Evidence rejected: water flow test video missing.",
    timestamp: "2025-08-10T16:00:00Z",
  },
  {
    id: "al3",
    actor: MOCK_USERS[7]!,
    action: "user.created",
    resourceType: "User",
    resourceId: "u3",
    details: "New worker account created for Arun Kumar.",
    timestamp: "2025-05-20T11:00:00Z",
  },
  {
    id: "al4",
    actor: MOCK_USERS[5]!,
    action: "service_request.created",
    resourceType: "ServiceRequest",
    resourceId: "sr2",
    details: "Service request created: Kitchen Tap Leaking — Urgent.",
    timestamp: "2025-08-18T14:00:00Z",
  },
  {
    id: "al5",
    actor: MOCK_USERS[0]!,
    action: "evidence.submitted",
    resourceType: "Evidence",
    resourceId: "e3",
    details: "Evidence submitted for Fault Diagnosis criterion.",
    timestamp: "2025-08-01T09:00:00Z",
  },
];

// ── Onboarding steps ──────────────────────────────────────────────────────────

export const ONBOARDING_SLIDES = [
  {
    id: "ob1",
    title: "Verified Skills,\nTrusted Connections",
    subtitle: "CraftRelay helps skilled workers get recognised and customers find the right professional every time.",
    icon: "✅",
  },
  {
    id: "ob2",
    title: "Evidence-Based\nAssessment",
    subtitle: "Workers submit evidence of their work. Qualified assessors review and certify skills to national standards.",
    icon: "🏆",
  },
  {
    id: "ob3",
    title: "Find Verified\nProfessionals",
    subtitle: "Browse workers by skill, location, and rating. Every verified badge is earned — not just claimed.",
    icon: "🔍",
  },
];
