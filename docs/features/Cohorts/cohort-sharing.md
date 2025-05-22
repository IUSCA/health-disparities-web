# Cohort Sharing

## Overview
Cohort sharing is a feature that allows users to share cohorts with other users or groups within the system. This document outlines the requirements, user stories, and design considerations for implementing cohort sharing.

## User Stories

### **As a User (Researcher)**

1. **Share with Specific Users**

   * *As a user*, I want to share my cohort with specific users so they can collaborate or view it.

2. **Group-based Sharing**

   * *As a user*, I want to share a cohort with a group (e.g., department) instead of selecting users one by one.

3. **Link Sharing (Authenticated)**

   * *As a user*, I want to share a cohort via a link that allows any authenticated portal user to access it.

4. **List Shared Cohorts**

   * *As a user*, I want to view a list of cohorts shared with me, and filter/sort/paginate them to find what I need.

5. **Granular Permissions**

   * *As a user*, I want to control what others can do with the cohort I share (e.g., view only, edit query).

6. **Audit Trail**

   * *As a user*, I want to see who edited my shared cohort and when.

7. **Revoke Access**

   * *As a user*, I want to manage the list of people or groups I’ve shared the cohort with, and change or revoke access.

8. **Invite by Email**

   * *As a user*, I want to invite a collaborator by email even if they’re not a registered user.

9. **Temporary Access**

   * *As a user*, I want to grant access that expires after a time period or usage condition.

10. **Notifications**

    * *As a user*, I want to be notified when someone shares a cohort with me or updates one I have access to.

11. **Prevent Transitive Sharing**

    * *As a user*, I want only original sharers to control access — recipients should not be able to re-share.

12. **Per-Share Custom Message**

  * *As a user*, I want to attach a custom message or notes when sharing a cohort to provide context or instructions.

### **Functional Requirements**

1. **Permission Enforcement Layer**

   * Inject permission checks into cohort access logic.
   * Decouple permission checks from cohort business logic and keep it declarative.

2. **Notification System**

   * Trigger messages on cohort share/update via internal notification or email.

3. **Access Revocation**

    * Remove share and immediately enforce permission changes across sessions.

4. **Share Consistency**

  * Ensure permissions propagate immediately across replicas or caches.
  * Resolve permissions at request time and not via session / JWT.

5. **Fail-Closed Access Logic**

  * If permission checks fail, default to denial rather than accidental grant.

6. **Data Access Scoping**

  * Share permissions should not override role-level data access policies.

## Data Model

```prisma
model cohort_share {
  id              Int           @id @default(autoincrement())
  cohort_id       String        @db.Uuid
  cohort          cohort        @relation(fields: [cohort_id], references: [id], onDelete: Cascade)
  
  // Share targets
  user_id         Int?          // direct user share
  user            user?         @relation(fields: [user_id], references: [id], onDelete: Cascade)

  group_id        Int?          // group-based share
  group           user_group?   @relation(fields: [group_id], references: [id], onDelete: Cascade)

  link_token      String?       @unique // for authenticated link sharing
  
  permission      SharePermission  // Enum: VIEW, EDIT, etc.
  expires_at      DateTime?     // optional expiry

  created_by_id   Int           // who shared it
  created_by      user          @relation("shared_by", fields: [created_by_id], references: [id], onDelete: Cascade)
  created_at      DateTime      @default(now()) @db.Timestamp(6)

  @@check(
    // ensure only one of user_id, group_id, or link_token is set
    name: "one_target_only",
    expr: "((user_id IS NOT NULL)::int + (group_id IS NOT NULL)::int + (link_token IS NOT NULL)::int) = 1"
  )
}

enum SharePermission {
  VIEW
  EDIT
}
```

```prisma
model cohort_share_audit {
  id              Int       @id @default(autoincrement())
  cohort_id       String    @db.Uuid
  changed_by_id         Int       // user who made the change
  changed_by            user      @relation(fields: [user_id], references: [id])
  action          String    // e.g., "edited", "viewed", "revoked"
  timestamp       DateTime  @default(now()) @db.Timestamp(6)
  old_data        Json?     
  new_data        Json?
  reason         String?   // optional reason for the change
}
```

## **Access Enforcement Design Notes**

* **Access Check Logic** should resolve permissions at request time via a unified query:

  * Direct user match
  * Group membership
  * Link token (if link present & user authenticated)
  * Not expired

* **Revocation**: Simply delete the `cohort_share` row. Immediate effect.

* **Transitive Sharing Block**: Only the `created_by` in `cohort_share` can modify or revoke their share.

* **Fail-Closed**: Access middleware returns 403 if no valid share or user is not allowed.

* **Granular Control**: The `permission` enum determines access level (can be extended with `COMMENT`, `MANAGE`, etc. later).

* **Temporary Access**: `expires_at` on `cohort_share` and `cohort_invite`.

* **Notification Hooks**: Trigger on `cohort_share` create/update/delete and on `cohort` update where shared.


## **API Endpoints**


### Get all cohorts shared with me
GET `/cohorts/shared_with_me`
- **Response**: List of cohorts with details on who shared them, permissions, and expiry.
- Support pagination, sorting, searching and filtering.

```sql
SELECT * FROM cohort_share
WHERE (user_id = ? OR group_id IN (SELECT id FROM user_group WHERE user_id = ?))
AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY created_at DESC
```


### Get all cohorts I shared
GET `/cohorts/shared_by_me`
- **Response**: List of cohorts I shared with details on recipients, permissions, and expiry.
- Support pagination, sorting, and filtering.


### Share a cohort
POST `/cohorts/{cohort_id}/share`

- **Request**: JSON body with `user_id`, `group_id`, `link_token`, `permission`, and optional `expires_at`.
- **Response**: Confirmation of share with cohort ID and share ID.

### Update a share
PATCH `/cohorts/share/{share_id}`
- **Request**: JSON body with updated `permission`, `expires_at`, or `link_token`.
- **Response**: Confirmation of update with share ID.

### Revoke a share
DELETE `/cohorts/share/{share_id}`
- **Response**: Confirmation of revocation with share ID.


### Get audit logs for a cohort share
GET `/cohorts/{cohort_id}/share/audit`
- **Response**: List of audit logs for the cohort share, including who made changes and what was changed.
- Support pagination, sorting, and filtering.

### Get share details of a cohort
GET `/cohorts/{cohort_id}/share`
- **Response**: List of all shares for the cohort, including user/group, permissions, and expiry.
- Support pagination, sorting, and filtering.


