Recommended implementation roadmap PHASE 2

1. Phase 1 — Document request management Next

   Connect the existing request forms to PostgreSQL.
   - Submit the three supported document types.
   - Save request details and subject add/withdraw entries.
   - Generate unique request references.
   - Display the user's actual submitted requests.
   - Open saved request details.

2. Phase 2 — Approval workflow

   Build the actual approval process.
   - Assign requests to the correct approvers.
   - Display pending approval tasks.
   - Approve, reject, or return requests for revision.
   - Record approval history and timestamps.
   - Enforce role-based approval permissions.

3. Phase 3 — Notifications
   - Notify students when their requests change.
   - Notify approvers when a request is assigned.
   - Track read and unread notifications.
4. Phase 4 — E-signatures
   - Capture signatures during approval.
   - Use signature images temporarily.
   - Never persist signature images, base64, blobs, URLs, or file references.
   - Record the approval event instead.
5. Phase 5 — Account and administration
   - Display actual user profiles.
   - Manage account activation.
   - Manage application roles.
   - Provide administrative oversight and audit logs.
6. Phase 6 — Testing and security
   - Test every document type.
   - Test every approval role.
   - Test unauthorized access.
   - Test session expiration and logout.
   - Verify database constraints and transaction rollback.

# =

# =

=
Recommended development roadmap PHASE 3

1. 1. Define the approval hierarchy

   Establish who reviews, approves, returns, or rejects each document type.
   - Academic Load Revision Permit
   - Shifter's Application Form
   - Leave of Absence Form

2. 2. Design the approval database

   Add the necessary tables for:
   - Approval stages and routing
   - Assigned approvers
   - Approval decisions and remarks
   - Approval history and audit trail

3. 3. Implement backend approval APIs
   - Retrieve assigned pending requests.
   - Approve or reject requests.
   - Return requests for revision.
   - Validate approver permissions.
   - Record every decision.
4. 4. Connect the frontend

   Make the existing Review Page functional, including request details, approval actions, and decision history.

5. 5. Test the complete workflow

   Test every document type using the demo student, adviser, chairperson, dean, and registrar accounts.

6. Recommended next development tasks
   I recommend this order:
7. Approver access control: Restrict request lists and details to users authorized to view them. This is particularly important because the current service implementation allows non-students to see all requests.
8. Rejection workflow: Allow an assigned approver to reject a request, record remarks, and update its status.
9. Return-for-revision workflow: Allow an approver to return a request to the student, then handle resubmission.
10. Frontend integration: Connect the Review page to the working approval endpoint.
11. Security and edge-case testing: Test wrong users, duplicate approvals, inactive accounts, and invalid workflow states.

SUNDAY
Fixing approval, history, progress flow
