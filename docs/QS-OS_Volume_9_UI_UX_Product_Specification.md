# QS-OS Workflow Engine Blueprint
# Volume 9 – UI/UX Product Specification
Version: 1.0

> This specification defines the user interface and user experience design for QS-OS.
>
> It covers product navigation, screen structure, user journeys, dashboard design, project workspace, workflow canvas, node library, property panel, execution viewer, approval inbox, document experience, Pack manager, marketplace, admin settings, responsive design, accessibility, visual states, design system, MVP screens, wireframes, and implementation guidance.
>
> This document translates the technical architecture of QS-OS into a usable product experience for Quantity Surveyors, estimators, procurement officers, contract managers, approvers, developers, and administrators.

---

# 1. Purpose

The purpose of this document is to define how users will experience QS-OS.

The previous volumes define:

```text
What QS-OS is
How workflows are stored
How nodes are built
How Packs are installed
How workflows run
How data is stored
How APIs communicate
```

This volume defines:

```text
How users see it
How users navigate it
How users build workflows
How users run workflows
How users approve work
How users understand results
How users trust the system
```

---

# 2. UI/UX Philosophy

QS-OS should feel like:

```text
A professional construction command center
+
A visual automation builder
+
A QS productivity tool
+
An auditable business system
```

The interface should be:

- Clear
- Fast
- Practical
- Trustworthy
- Construction-focused
- Friendly to non-programmers
- Powerful for advanced users
- Safe for commercial decisions

---

# 3. Core UX Principles

1. **Workflow first**  
   The workflow is the main product experience.

2. **Construction language first**  
   Use QS and construction terms, not generic developer language.

3. **AI must be reviewable**  
   AI output should always show confidence, explanation, and review option.

4. **Human approval must be visible**  
   Users must clearly see where a workflow is waiting for approval.

5. **No hidden automation**  
   Users must know what happened, when, and why.

6. **Every output should be traceable**  
   Reports, RFQs, claims, and certificates should link back to workflow execution.

7. **Start simple, reveal power gradually**  
   MVP should be usable without overwhelming users.

8. **Design for QS daily work**  
   Upload BOQ, classify, compare, approve, generate documents, review logs.

9. **Errors must be actionable**  
   Users should know what failed and how to fix it.

10. **Audit builds trust**  
   Execution logs and approval records should be easy to understand.

---

# 4. Target Users

## 4.1 Quantity Surveyor

Needs to:

- Upload BOQ
- Review BOQ items
- Classify trades
- Generate RFQs
- Prepare claims
- Review variations
- Generate reports
- Track workflow output

## 4.2 Senior Quantity Surveyor

Needs to:

- Review AI outputs
- Approve cost summaries
- Approve RFQs
- Validate workflow results
- Review execution logs
- Control templates

## 4.3 Estimator

Needs to:

- Read BOQ
- Build rates
- Generate cost summary
- Review tender risk
- Prepare pricing basis

## 4.4 Procurement Officer

Needs to:

- Generate RFQs
- Manage suppliers
- Compare quotations
- Prepare purchase orders
- Track supplier responses

## 4.5 Contract Manager

Needs to:

- Review variations
- Review claims
- Review contract risks
- Prepare payment certificates
- Track contract workflow status

## 4.6 Approver

Needs to:

- See approval requests
- Review attachments
- Understand recommendation
- Approve, reject, or request changes
- Leave comments

## 4.7 Admin

Needs to:

- Manage users
- Manage roles
- Install Packs
- Grant permissions
- Review audit logs
- Configure organization settings

## 4.8 Developer / Pack Builder

Needs to:

- View node definitions
- Test nodes
- Validate Packs
- Inspect workflow JSON
- Review execution logs

---

# 5. Product Personality

QS-OS should feel:

```text
Professional
Reliable
Modern
Calm
Structured
Transparent
Intelligent
Practical
```

It should not feel:

```text
Toy-like
Overly playful
Too technical for QS users
Too complex at first screen
Opaque in AI decisions
```

---

# 6. Information Architecture

Primary navigation:

```text
Dashboard
Projects
Workflows
Executions
Approvals
Documents
Packs
Reports
Admin
```

Secondary navigation inside a project:

```text
Overview
BOQ
Tender
Procurement
Contract
Claims
Variations
Documents
Workflows
Executions
Reports
Settings
```

---

# 7. Global Application Layout

Recommended layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ Top Bar: Organization | Search | Notifications | User Menu   │
├───────────────┬─────────────────────────────────────────────┤
│ Sidebar       │ Main Content                                │
│ Navigation    │ Page-specific workspace                      │
│               │                                             │
└───────────────┴─────────────────────────────────────────────┘
```

---

# 8. Top Bar

The top bar should include:

```text
Organization switcher
Project switcher if inside project
Global search
Notification bell
Approval indicator
Help / documentation
User profile menu
```

Top bar actions should be consistent across pages.

---

# 9. Sidebar Navigation

Sidebar sections:

```text
Main
- Dashboard
- Projects
- Workflows
- Executions
- Approvals
- Documents

Platform
- Packs
- Reports
- Admin
```

For MVP, keep sidebar simple.

---

# 10. Global Search

Search should eventually support:

```text
Projects
Workflows
Executions
Documents
BOQ items
Suppliers
RFQs
Approvals
Packs
```

MVP search can start with:

```text
Projects
Workflows
Documents
Executions
```

---

# 11. Dashboard Page

Purpose:

Give users a quick overview of work requiring attention.

Dashboard sections:

```text
Active Projects
Recent Workflows
Running Executions
Pending Approvals
Recent Documents
Failed Workflows
Quick Actions
```

---

# 12. Dashboard Wireframe

```text
┌─────────────────────────────────────────────────────────────┐
│ Dashboard                                                   │
├─────────────────────────────────────────────────────────────┤
│ Quick Actions: [New Project] [New Workflow] [Upload BOQ]    │
├───────────────┬───────────────┬───────────────┬─────────────┤
│ Active Projects│ Pending Approvals│ Running Workflows│ Failed│
├───────────────┴───────────────┴───────────────┴─────────────┤
│ Recent Activity Timeline                                    │
├─────────────────────────────────────────────────────────────┤
│ Recent Workflows                                            │
└─────────────────────────────────────────────────────────────┘
```

---

# 13. Dashboard Cards

Recommended cards:

```text
Active Projects
Pending Approvals
Running Executions
Failed Executions
Documents Generated
AI Reviews Pending
```

Each card should be clickable.

---

# 14. Quick Actions

Quick actions:

```text
Create Project
Upload BOQ
Create Workflow
Run BOQ to RFQ Template
Open Approval Inbox
Install Pack
```

For MVP, prioritize:

```text
Create Project
Upload BOQ
Create Workflow
Open Approvals
```

---

# 15. Projects Page

Purpose:

List and manage projects.

Features:

```text
Project list
Search
Status filter
Project type filter
Create project button
Project cards or table view
Recent activity indicator
```

---

# 16. Project Card

Project card should show:

```text
Project name
Project code
Client
Location
Status
Currency
Active workflows
Pending approvals
Recent execution status
```

---

# 17. Create Project Flow

Steps:

```text
Enter project name
Enter project code
Select project type
Enter client name
Select currency
Select timezone
Create project
Open project workspace
```

MVP should make project creation quick.

---

# 18. Project Workspace

The project workspace is the main working area.

Tabs:

```text
Overview
BOQ
Tender
Procurement
Contract
Claims
Documents
Workflows
Executions
Reports
Settings
```

MVP tabs:

```text
Overview
Documents
Workflows
Executions
Approvals
```

---

# 19. Project Overview Page

Sections:

```text
Project summary
Active workflows
Recent executions
Pending approvals
Documents
Key QS data
Recent activity
```

---

# 20. Project Overview Wireframe

```text
┌─────────────────────────────────────────────────────────────┐
│ Project: Mini Stadium Project                               │
│ Status | Currency | Client | Location                       │
├─────────────────────────────────────────────────────────────┤
│ [Run Workflow] [Upload Document] [Create BOQ]                │
├───────────────┬───────────────┬───────────────┬─────────────┤
│ Workflows     │ Executions    │ Approvals     │ Documents   │
├─────────────────────────────────────────────────────────────┤
│ Recent Activity                                              │
├─────────────────────────────────────────────────────────────┤
│ Recommended Workflow Templates                               │
└─────────────────────────────────────────────────────────────┘
```

---

# 21. Workflow List Page

Purpose:

Show workflows belonging to a project or organization.

Features:

```text
List workflows
Search
Filter by status
Filter by category
Create workflow
Create from template
Open editor
Run workflow
View execution history
```

---

# 22. Workflow List Item

Each workflow item should show:

```text
Workflow name
Category
Status
Current version
Last updated
Last execution status
Created by
Quick actions
```

Quick actions:

```text
Open
Run
Duplicate
Validate
Archive
```

---

# 23. Create Workflow Options

Users should be able to:

```text
Start blank workflow
Start from template
Import workflow JSON
Duplicate existing workflow
```

For MVP, provide:

```text
Start blank
Start from BOQ to RFQ template
```

---

# 24. Workflow Editor

The Workflow Editor is the heart of QS-OS.

It includes:

```text
Workflow header
Canvas toolbar
Node library panel
Workflow canvas
Property panel
Validation panel
Execution panel
Mini map
Status bar
```

---

# 25. Workflow Editor Layout

```text
┌─────────────────────────────────────────────────────────────┐
│ Workflow Header: Name | Status | Save | Validate | Run       │
├──────────────┬──────────────────────────────┬───────────────┤
│ Node Library │ Canvas                       │ Property Panel│
│              │                              │               │
│              │                              │               │
├──────────────┴──────────────────────────────┴───────────────┤
│ Bottom Panel: Validation | Logs | JSON | Execution           │
└─────────────────────────────────────────────────────────────┘
```

---

# 26. Workflow Header

Header should show:

```text
Workflow name
Project name
Workflow status
Version
Save status
Validation status
Run button
More menu
```

Actions:

```text
Save
Validate
Run
Publish / Activate
Export
Import
Duplicate
View JSON
```

---

# 27. Canvas Toolbar

Toolbar actions:

```text
Select
Pan
Zoom in
Zoom out
Fit view
Auto layout
Undo
Redo
Validate
Run
Toggle minimap
Toggle logs
```

---

# 28. Node Library Panel

Purpose:

Allows users to drag nodes onto the canvas.

Sections:

```text
Search nodes
Recently used
Core
Document
QS
Procurement
Contract
AI
Integration
Installed Packs
```

---

# 29. Node Library Card

Each node card should show:

```text
Icon
Node name
Short description
Category
Pack name
Input/output hints
AI badge if AI-enabled
Approval badge if approval node
```

Example:

```text
Read BOQ
QS Pack
Reads and normalizes BOQ spreadsheet data.
Inputs: File
Outputs: BOQ Items, Warnings
```

---

# 30. Node Search

Users should be able to search:

```text
Read BOQ
RFQ
Approval
AI
Excel
Quotation
Variation
```

Search should match:

```text
Node name
Description
Tags
Pack name
Category
```

---

# 31. Workflow Canvas Behavior

Canvas supports:

```text
Drag node
Move node
Connect ports
Delete node
Duplicate node
Group nodes
Collapse node
Open node settings
Show node state
Show validation error
Show execution status
```

---

# 32. Node Visual Design

Node card on canvas should show:

```text
Node icon
Node title
Node type
Input ports
Output ports
Status badge
Error badge
AI badge
Approval badge
```

---

# 33. Node States

Visual states:

```text
Idle
Selected
Invalid
Ready
Running
Completed
Failed
Waiting
Paused
Skipped
Disabled
Retrying
```

Recommended visual behavior:

```text
Running node:
show animation or spinner

Completed node:
show success indicator

Failed node:
show error indicator

Waiting approval:
show pause / clock indicator

Disabled:
muted appearance
```

---

# 34. Port Design

Port types should be visible or discoverable.

Examples:

```text
File
BOQ Items
Trade Packages
RFQ Documents
Approval Decision
Errors
Warnings
```

Port tooltip should show:

```text
Port name
Type
Required or optional
Description
```

---

# 35. Connection Design

Connections should show:

```text
Data flow direction
Optional label
Condition indicator
Error branch styling
Disabled state
```

Connection click opens:

```text
Mapping settings
Condition settings
Type compatibility
Delete action
```

---

# 36. Property Panel

Purpose:

Edit selected node, connection, group, or workflow settings.

Sections for node:

```text
General
Inputs
Configuration
AI
Approval
Retry
Error Handling
Security
Debug
Documentation
```

---

# 37. Property Panel: General

Fields:

```text
Node name
Description
Node type
Pack
Version
Enabled / disabled
Notes
```

---

# 38. Property Panel: Configuration

Generated from node configuration schema.

Examples for Read BOQ:

```text
Sheet name
Header row
Item column
Description column
Quantity column
Unit column
Rate column
Amount column
Currency
```

---

# 39. Property Panel: AI

For AI-enabled nodes:

```text
Prompt
Prompt version
Model profile
Temperature
Output format
Confidence threshold
Human review below confidence
Token budget
```

Show warning:

```text
AI output should be reviewed for commercial decisions.
```

---

# 40. Property Panel: Approval

For approval nodes:

```text
Approval title
Assignee user
Assignee role
Due date
Decision options
Required attachments
Resume behavior
Rejection behavior
```

---

# 41. Property Panel: Retry

Fields:

```text
Retry enabled
Max attempts
Delay
Backoff type
Retryable error codes
```

---

# 42. Property Panel: Error Handling

Fields:

```text
On failure
On validation warning
On timeout
Error branch
Manual review option
```

---

# 43. Property Panel: Documentation

Should show:

```text
Node purpose
Inputs
Outputs
Configuration help
Common errors
Examples
Link to full documentation
```

This is important for non-technical users.

---

# 44. Validation Panel

The validation panel shows workflow readiness.

Sections:

```text
Errors
Warnings
Information
Missing dependencies
Missing permissions
Invalid connections
Invalid node configuration
```

Each validation item should:

```text
Explain problem
Show affected node
Offer fix action where possible
```

---

# 45. Validation Message Example

```text
Error:
Read BOQ node is missing required field: Header Row.

Action:
Open node configuration.
```

---

# 46. Workflow JSON Viewer

Advanced users and developers may view Workflow JSON.

Features:

```text
Read-only JSON view by default
Copy JSON
Export JSON
Validate JSON
Developer edit mode later
```

MVP should keep JSON editing disabled unless developer mode is enabled.

---

# 47. Run Workflow Flow

Steps:

```text
Click Run
  ↓
System validates workflow
  ↓
User provides required inputs
  ↓
System checks permissions
  ↓
Execution starts
  ↓
Execution viewer opens
```

---

# 48. Run Modal

Run modal should show:

```text
Workflow name
Version
Mode
Required inputs
Warnings
Permissions used
Run button
Cancel button
```

Modes:

```text
Standard
Debug
Dry Run
```

MVP:

```text
Standard
Dry Run
```

---

# 49. Execution Viewer

Purpose:

Show what is happening during workflow execution.

Layout:

```text
┌─────────────────────────────────────────────────────────────┐
│ Execution Header: Status | Workflow | Version | Duration     │
├───────────────┬─────────────────────────────────────────────┤
│ Node Timeline │ Execution Details                           │
│               │ Logs / Outputs / Artifacts / Approvals       │
└───────────────┴─────────────────────────────────────────────┘
```

---

# 50. Execution Viewer Sections

```text
Overview
Node Timeline
Logs
Outputs
Artifacts
Approvals
AI Usage
Errors
Snapshot
```

MVP sections:

```text
Overview
Node Timeline
Logs
Artifacts
Approvals
```

---

# 51. Execution Timeline

Timeline item shows:

```text
Node name
Node type
Status
Started time
Duration
Attempt count
Error if any
```

Clicking timeline item opens node execution detail.

---

# 52. Node Execution Detail

Shows:

```text
Inputs summary
Outputs summary
Logs
Errors
Duration
Attempt count
Pack and node version
Artifacts generated
AI usage if any
```

Secrets must be masked.

---

# 53. Execution Logs UX

Logs should support:

```text
Filter by level
Filter by node
Search
Auto-scroll
Copy log
Download log
```

Log levels:

```text
Debug
Info
Warning
Error
Critical
```

Default view should hide debug logs unless enabled.

---

# 54. Artifacts UX

Artifacts are generated files.

Artifact card should show:

```text
File name
Type
Generated by node
Generated time
Size
Download
Preview
Link to approval if attached
```

---

# 55. AI Usage UX

AI usage should show:

```text
AI node
Prompt used
Model profile
Confidence score
Token usage
Output summary
Human review status
```

Do not show hidden chain-of-thought style reasoning.

Show concise explanation and structured output.

---

# 56. Approval Inbox

Purpose:

Central place for human decisions.

List columns:

```text
Title
Project
Workflow
Requested by
Due date
Status
Priority
Actions
```

Filters:

```text
Pending
Approved
Rejected
Changes requested
Overdue
Assigned to me
Assigned to my role
```

---

# 57. Approval Detail Page

Should show:

```text
Approval title
Description
Workflow context
Execution context
Requested by
Due date
Attachments
AI recommendation if any
Decision options
Comments
Audit history
```

Decision buttons:

```text
Approve
Reject
Request Changes
Delegate
Cancel
```

---

# 58. Approval Decision UX

Before final decision:

```text
Show confirmation if high-risk
Require comment for rejection
Require comment for request changes
Show what workflow branch will happen next
```

Example:

```text
If you approve, the workflow will continue to generate final RFQ documents.
```

---

# 59. Documents Page

Purpose:

Manage project documents.

Features:

```text
Upload document
List documents
Filter by type
Search
Preview
Download
Version history
Link to workflow execution
```

---

# 60. Document Types

Document filters:

```text
BOQ
Drawing
Specification
RFQ
Quotation
Purchase Order
Variation Order
Progress Claim
Payment Certificate
Final Account
Report
Other
```

---

# 61. Upload Document Flow

Steps:

```text
Choose file
Select document type
Add name
Add description
Upload
Register document
Optionally run workflow
```

After BOQ upload, suggest:

```text
Run BOQ to RFQ workflow
Run BOQ Summary workflow
```

---

# 62. BOQ Page

Purpose:

Show structured BOQ data.

Sections:

```text
BOQ summary
BOQ items table
Trade classification
Trade packages
Import status
AI classification status
```

MVP may defer full BOQ page if workflow outputs are enough.

---

# 63. BOQ Items Table

Columns:

```text
Item No
Description
Unit
Quantity
Rate
Amount
Trade
Section
Confidence
Status
```

Features:

```text
Search
Filter by trade
Edit item
Bulk classify
Export
```

---

# 64. Procurement Page

Purpose:

Manage RFQs, quotations, suppliers, and purchase orders.

Sections:

```text
RFQs
Suppliers
Quotations
Comparisons
Purchase Orders
```

MVP can include only RFQ artifact output.

---

# 65. RFQ Detail Page

Should show:

```text
RFQ title
Trade package
Supplier list
Documents
Status
Closing date
Sent history
Quotations received
Approval status
```

---

# 66. Quotation Comparison UX

Comparison table should show:

```text
Supplier
Total amount
Compliance
Delivery
Exclusions
Clarifications
AI recommendation
QS remarks
```

Users must be able to override AI recommendation.

---

# 67. Packs Page

Purpose:

Manage installed Packs.

Sections:

```text
Installed Packs
Available Packs
Pack Details
Permissions
Nodes Included
Templates
Prompts
Updates
```

---

# 68. Installed Pack Card

Shows:

```text
Pack name
Version
Category
Status
Publisher
Nodes count
Permissions
Update available
```

Actions:

```text
View
Configure
Grant permissions
Update
Disable
Uninstall
```

---

# 69. Pack Detail Page

Sections:

```text
Overview
Nodes
Templates
Prompts
Permissions
Dependencies
Configuration
Changelog
Documentation
Security
```

---

# 70. Pack Permission UX

Permission screen should explain:

```text
What permission is requested
Why it is needed
Risk level
Who approved it
When it was approved
```

Example:

```text
email.send
Allows this Pack to send RFQ emails on behalf of the organization.
Admin approval required.
```

---

# 71. Marketplace UX

Marketplace can come later.

Marketplace sections:

```text
Featured Packs
Official Packs
Verified Partner Packs
Community Packs
Private Packs
Categories
Search
Ratings
Certification
```

MVP can show installed Packs only.

---

# 72. Admin Settings UX

Admin sections:

```text
Organization Profile
Users and Roles
Project Settings
Permissions
Pack Permissions
AI Policy
Security
Audit Logs
Billing later
```

---

# 73. User Management UX

Admin should be able to:

```text
Invite user
Change role
Deactivate user
View project access
View recent activity
```

---

# 74. AI Policy UX

Settings:

```text
Allow external AI provider
Require human review for high-risk AI
Default model profile
Token usage limit
Store AI outputs
Allow AI for confidential documents
```

---

# 75. Audit Logs UX

Audit page should show:

```text
Action
Actor
Target
Project
Timestamp
Details
```

Filters:

```text
Date range
User
Action
Project
Target type
```

Audit logs should be exportable.

---

# 76. Notifications UX

Notification types:

```text
Approval required
Workflow completed
Workflow failed
Document generated
Pack permission required
AI review needs human check
```

Notification should link users directly to action page.

---

# 77. Empty States

Every page needs helpful empty states.

Examples:

## No Projects

```text
No projects yet.
Create your first project to start building QS workflows.
[Create Project]
```

## No Workflows

```text
No workflows in this project.
Start from a template or create a blank workflow.
[Use Template] [Create Blank]
```

## No Approvals

```text
No pending approvals.
You are all caught up.
```

---

# 78. Loading States

Use clear loading states for:

```text
Saving workflow
Validating workflow
Running workflow
Loading execution logs
Uploading document
Generating RFQ
Waiting for approval
```

Do not leave users uncertain.

---

# 79. Error States

Error messages should be human-readable.

Bad:

```text
500 Internal Server Error
```

Good:

```text
RFQ document could not be generated because the template is missing.
Open Pack settings or choose another template.
```

---

# 80. Warning States

Warnings should not block unless necessary.

Examples:

```text
AI confidence is below threshold.
This workflow uses an optional Pack that is not installed.
This workflow has not been validated since the last edit.
```

---

# 81. Success States

Success messages should include next action.

Example:

```text
RFQ documents generated successfully.
[View Documents] [Open Execution Logs]
```

---

# 82. Onboarding Experience

First-time onboarding should guide users.

Steps:

```text
Create organization
Create project
Choose workflow template
Upload BOQ
Run workflow
Review output
Approve result
```

---

# 83. First-Run Demo Mode

QS-OS should provide a sample demo project.

Demo includes:

```text
Sample BOQ
BOQ to RFQ workflow
Sample execution
Sample approval
Sample generated RFQ
```

This helps users understand the product quickly.

---

# 84. Template Selection UX

Template card shows:

```text
Template name
Category
Difficulty
Estimated setup time
Required Packs
Required inputs
Preview workflow
Use template
```

Example:

```text
Tender BOQ to RFQ
Category: Tendering
Setup: 10 minutes
Requires: QS Pack, Document Pack, AI Pack
```

---

# 85. Workflow Template Preview

Preview should show:

```text
Workflow diagram
Purpose
Inputs required
Outputs generated
Approval steps
Packs required
```

---

# 86. MVP Primary User Journey

```text
Login
  ↓
Create project
  ↓
Upload BOQ
  ↓
Choose BOQ to RFQ template
  ↓
Open workflow editor
  ↓
Validate workflow
  ↓
Run workflow
  ↓
Watch execution
  ↓
Review generated RFQ
  ↓
Approve
  ↓
Download artifact
```

---

# 87. MVP Screens

MVP should include:

```text
Login
Dashboard
Projects list
Create project
Project overview
Documents page
Upload document
Workflow list
Workflow editor
Run workflow modal
Execution viewer
Approval inbox
Approval detail
Packs installed page
Admin basic settings
```

---

# 88. MVP Navigation

```text
Dashboard
Projects
Workflows
Executions
Approvals
Documents
Packs
Admin
```

Keep advanced modules hidden until ready.

---

# 89. MVP Workflow Editor Minimum

Must support:

```text
Add node
Move node
Connect node
Select node
Edit node configuration
Save workflow
Validate workflow
Run workflow
View validation messages
View execution status
```

---

# 90. MVP Execution Viewer Minimum

Must support:

```text
Execution status
Node list
Node status
Logs
Artifacts
Approval waiting state
Completion message
Failure message
```

---

# 91. MVP Approval Minimum

Must support:

```text
List pending approvals
Open approval
View attachments
Approve
Reject
Request changes
Comment
Resume workflow
```

---

# 92. MVP Design System

Use a simple design system.

Foundations:

```text
Typography
Spacing
Color tokens
Icon system
Button styles
Form fields
Cards
Tables
Tabs
Badges
Alerts
Modals
Drawers
Panels
Toasts
```

---

# 93. Typography

Recommended:

```text
Clear sans-serif font
Readable body text
Strong hierarchy
Avoid tiny text
```

Text hierarchy:

```text
Page title
Section title
Card title
Body text
Helper text
Caption
Code / JSON text
```

---

# 94. Color System

Color should communicate state.

State colors:

```text
Success
Warning
Error
Info
Neutral
Running
Waiting
Disabled
```

Do not rely only on color; also use icons and text.

---

# 95. Status Badges

Standard badges:

```text
Draft
Active
Inactive
Running
Completed
Failed
Waiting Approval
Paused
Invalid
Deprecated
Installed
Update Available
```

---

# 96. Icons

Use consistent icons for:

```text
Workflow
Node
Pack
Document
Approval
AI
Warning
Error
Success
Execution
Project
User
Settings
```

---

# 97. Buttons

Button hierarchy:

```text
Primary
Secondary
Ghost
Danger
Icon button
```

Examples:

```text
Primary: Run Workflow
Secondary: Validate
Danger: Cancel Execution
Ghost: View Logs
```

---

# 98. Forms

Form rules:

```text
Labels always visible
Helper text for technical settings
Validation inline
Required fields marked
Dangerous actions require confirmation
```

---

# 99. Tables

Tables should support:

```text
Search
Filter
Sort
Pagination
Column visibility later
Bulk actions later
```

Use tables for:

```text
BOQ items
Documents
Executions
Approvals
Suppliers
Quotations
Audit logs
```

---

# 100. Modals and Drawers

Use modals for:

```text
Confirmations
Run workflow
Create project
Upload document
Approve action
```

Use side drawers for:

```text
Node details
Execution logs
Document preview
Pack details
```

---

# 101. Toast Notifications

Use toasts for short feedback:

```text
Workflow saved
Validation completed
Execution started
Document uploaded
Approval submitted
```

Do not use toast for critical errors only; show persistent error panel.

---

# 102. Accessibility

QS-OS should support accessibility from early stages.

Requirements:

```text
Keyboard navigation
Visible focus states
Sufficient contrast
Text labels for icons
ARIA labels for canvas controls
Screen-reader friendly forms
Avoid color-only status
Resizable text
```

Workflow canvas accessibility is challenging, but basic keyboard and panel alternatives should be planned.

---

# 103. Responsive Design

QS-OS is primarily desktop-first because workflow canvas and QS tables need space.

Responsive priorities:

```text
Desktop first
Tablet usable
Mobile for approvals and notifications
```

Mobile should support:

```text
Approval inbox
Approval detail
Notifications
Execution status
Document preview
```

Mobile does not need full workflow editing in MVP.

---

# 104. Desktop Layout

Recommended for:

```text
Workflow editor
BOQ table
Quotation comparison
Execution viewer
Pack management
Admin settings
```

Minimum comfortable width:

```text
1280px
```

---

# 105. Tablet Layout

Tablet should support:

```text
Dashboard
Project overview
Approvals
Documents
Execution viewer
Limited workflow viewing
```

---

# 106. Mobile Layout

Mobile should support:

```text
Dashboard summary
Approval decisions
Notifications
Execution status
Document preview
```

Mobile workflow editing can be read-only in early versions.

---

# 107. Workflow Canvas Mobile Strategy

For mobile:

```text
View workflow as vertical steps
Show node statuses
Allow approval actions
Allow log viewing
Do not require drag-and-drop editing
```

---

# 108. Trust and Transparency UX

QS-OS must build trust.

Show:

```text
What node ran
What data was used
What AI decided
What confidence score
Who approved
When approval happened
What document was generated
What version of workflow ran
```

---

# 109. AI Transparency UX

AI output should show:

```text
Summary
Structured result
Confidence
Warnings
Prompt name
Prompt version
Human review recommendation
```

Avoid showing excessive technical details to normal users.

Allow advanced view for developers/admins.

---

# 110. Commercial Risk UX

High-risk actions need stronger UX.

High-risk examples:

```text
Send RFQ
Recommend supplier
Generate purchase order
Approve payment certificate
Finalize account
```

UX requirements:

```text
Confirmation
Role check
Approval requirement
Audit log
Clear consequence text
```

---

# 111. Confirmation Dialogs

Use confirmation dialogs for:

```text
Delete workflow
Archive project
Uninstall Pack
Grant high-risk permission
Send RFQ externally
Approve payment certificate
Cancel execution
```

Dialog should explain consequence.

---

# 112. Human Language Guidelines

Use clear language.

Prefer:

```text
Run workflow
Generate RFQ
Waiting for approval
AI confidence is low
Review required
```

Avoid:

```text
Invoke graph
Dispatch executor
Node runtime failed
Dependency resolution exception
```

Technical terms can appear in developer mode.

---

# 113. QS Terminology Guidelines

Use domain terms:

```text
BOQ
Trade Package
RFQ
Quotation
Rate Analysis
Variation Order
Progress Claim
Payment Certificate
Final Account
Cost Summary
```

Do not replace these with generic terms unnecessarily.

---

# 114. Developer Mode

Developer mode can reveal:

```text
Workflow JSON
Node IDs
Port IDs
Pack versions
Execution snapshot
Raw logs
Schema validation
API response
```

Developer mode should be optional.

---

# 115. Admin Mode

Admin mode includes:

```text
User roles
Pack permissions
AI policy
Audit logs
Organization settings
Security settings
```

Only admins see these sections.

---

# 116. Workflow Validation UX

Validation should run:

```text
On save
Before run
Before activation
After Pack update
```

Validation result should be visible in header.

Statuses:

```text
Not validated
Valid
Valid with warnings
Invalid
Missing permissions
Missing dependencies
```

---

# 117. Missing Dependency UX

Example:

```text
This workflow requires Procurement Pack.
[Install Pack] [View Details]
```

If user lacks permission:

```text
Ask your organization admin to install this Pack.
```

---

# 118. Missing Permission UX

Example:

```text
This workflow needs permission to generate documents.
Admin approval required.
[Request Permission]
```

---

# 119. Workflow Activation UX

Activation flow:

```text
Click Activate
  ↓
Validate
  ↓
Check dependencies
  ↓
Check permissions
  ↓
Show summary
  ↓
Confirm activation
```

Activation summary should show:

```text
Workflow version
Triggers enabled
Packs used
Permissions used
Risk level
```

---

# 120. Execution Failure UX

When execution fails:

Show:

```text
Failed node
Error message
Possible cause
Suggested fix
Retry action
Open logs
Contact admin if needed
```

Example:

```text
Generate RFQ failed because the RFQ template was not found.
Choose a valid RFQ template in the node configuration.
```

---

# 121. Retry UX

Users should be able to:

```text
Retry failed node
Retry from failed node
Retry whole execution
Run dry-run first
```

Warn if retry may repeat side effects.

---

# 122. Side Effect Warning UX

Before retrying side-effect nodes:

```text
This node may send external emails or create external records.
QS-OS will use idempotency protection, but please confirm before retrying.
```

---

# 123. Document Preview UX

Supported previews:

```text
PDF preview
Image preview
Text preview
Spreadsheet summary
Word document metadata
```

For unsupported file types:

```text
Show file metadata and download option.
```

---

# 124. Report UX

Reports should be readable and exportable.

Report features:

```text
Summary cards
Tables
Charts later
Export PDF
Export Excel
Link to source execution
Link to source workflow
```

---

# 125. Breadcrumbs

Use breadcrumbs for deep pages.

Example:

```text
Projects / Mini Stadium / Workflows / Tender BOQ to RFQ / Execution #123
```

---

# 126. Page Header Pattern

Each page should have:

```text
Title
Subtitle / context
Primary action
Secondary actions
Status badge if relevant
```

---

# 127. List Page Pattern

List pages should have:

```text
Page title
Primary action
Search
Filters
Table or cards
Empty state
Pagination
```

---

# 128. Detail Page Pattern

Detail pages should have:

```text
Header
Status
Tabs
Main content
Activity / audit side panel
Actions
```

---

# 129. Wizard Pattern

Use wizard for complex setup:

```text
Create workflow from template
Install Pack
Configure AI provider
Import workflow
```

Wizard steps should be visible.

---

# 130. Activity Timeline

Activity timeline can show:

```text
Workflow created
Document uploaded
Workflow executed
Node failed
Approval requested
Approval completed
Artifact generated
```

Timeline should appear in:

```text
Project overview
Workflow detail
Execution detail
Approval detail
Document detail
```

---

# 131. Component Inventory

Core components:

```text
AppShell
TopBar
Sidebar
PageHeader
ProjectSwitcher
OrganizationSwitcher
StatusBadge
MetricCard
DataTable
FilterBar
SearchInput
ActionMenu
ConfirmDialog
UploadDropzone
WorkflowCanvas
NodeCard
PortHandle
NodeLibrary
PropertyPanel
ValidationPanel
ExecutionTimeline
LogViewer
ArtifactCard
ApprovalDecisionPanel
DocumentPreview
PackCard
PermissionCard
AuditTimeline
```

---

# 132. Workflow Canvas Components

```text
WorkflowEditor
CanvasToolbar
CanvasViewport
CanvasMiniMap
NodeLibraryPanel
NodeRenderer
ConnectionRenderer
PropertyPanel
BottomPanel
ValidationDrawer
ExecutionOverlay
```

---

# 133. Execution Components

```text
ExecutionHeader
ExecutionStatusBadge
ExecutionTimeline
NodeExecutionCard
LogViewer
OutputViewer
ArtifactList
ApprovalWaitPanel
RetryPanel
ErrorExplanation
```

---

# 134. Approval Components

```text
ApprovalInbox
ApprovalCard
ApprovalDetail
DecisionButtons
ApprovalCommentBox
AttachmentList
ApprovalHistory
RiskNotice
```

---

# 135. Pack Components

```text
PackList
PackCard
PackDetail
PackPermissionList
PackNodeList
PackTemplateList
PackInstallDialog
PackUpdateBanner
```

---

# 136. Design Tokens

Recommended token groups:

```text
color
spacing
radius
shadow
font
fontSize
lineHeight
zIndex
breakpoint
duration
```

---

# 137. Status Token Examples

```text
status.success
status.warning
status.error
status.info
status.running
status.waiting
status.disabled
```

---

# 138. UX Acceptance Criteria

A screen is acceptable if:

```text
User knows where they are
User knows what they can do
Primary action is clear
Status is visible
Errors are actionable
Loading state is clear
Empty state is helpful
Sensitive actions require confirmation
```

---

# 139. MVP UI Acceptance Criteria

MVP UI must allow:

```text
Create project
Upload BOQ document
Create workflow from template
Open workflow editor
Configure nodes
Save workflow
Validate workflow
Run workflow
View execution progress
View logs
View generated artifacts
Approve workflow pause
View installed Packs
```

---

# 140. UI Testing

UI tests should cover:

```text
Navigation
Create project
Upload document
Create workflow
Drag node
Connect node
Save workflow
Validate workflow
Run workflow
Approval decision
Execution log viewing
Artifact download
```

---

# 141. Usability Testing Tasks

Ask test users to:

```text
Create a project
Upload a BOQ
Find the BOQ to RFQ template
Run the workflow
Find the generated RFQ
Approve an approval request
Find execution logs
Explain what AI did
```

Measure:

```text
Can user complete task?
Where do they hesitate?
Which terms confuse them?
Do they trust the output?
Do they understand approval flow?
```

---

# 142. MVP Wireframe Map

```text
/login
/dashboard
/projects
/projects/new
/projects/:id/overview
/projects/:id/documents
/projects/:id/workflows
/workflows/:id/editor
/executions/:id
/approvals
/approvals/:id
/packs
/packs/:id
/admin/settings
```

---

# 143. Login Page

Simple login page:

```text
QS-OS logo
Tagline
Email
Password
Sign in
Sign up / invite flow
Forgot password
```

Tagline:

```text
The workflow operating system for Quantity Surveyors.
```

---

# 144. Dashboard MVP Layout

```text
Page Header
Quick Actions
Metric Cards
Pending Approvals
Recent Executions
Recent Projects
```

---

# 145. Project MVP Layout

```text
Project Header
Tabs
Overview Cards
Recent Workflows
Documents
Recent Executions
```

---

# 146. Workflow Editor MVP Layout

```text
Header
Left Node Library
Center Canvas
Right Property Panel
Bottom Validation / Logs Panel
```

---

# 147. Execution Viewer MVP Layout

```text
Header
Status Summary
Node Timeline
Logs
Artifacts
Approval Waiting Panel
```

---

# 148. Approval Detail MVP Layout

```text
Header
Context Summary
Attachments
AI / System Recommendation
Decision Buttons
Comments
History
```

---

# 149. Recommended Implementation Stack

Frontend:

```text
Next.js
React
React Flow
Tailwind CSS
Shadcn UI or similar
Lucide icons or similar
Zustand or similar state store
TanStack Query for API data
```

Backend integration:

```text
REST API
WebSocket or Supabase Realtime for execution updates
Signed URLs for file upload/download
```

---

# 150. Frontend State Management

Recommended state groups:

```text
auth state
organization state
project state
workflow editor state
canvas state
selected node state
validation state
execution live state
approval state
document upload state
```

---

# 151. Workflow Editor State

Should track:

```text
nodes
connections
selected node
selected connection
dirty state
save status
validation status
execution overlay
canvas viewport
undo/redo history
```

---

# 152. Autosave Strategy

MVP can use manual save.

Later:

```text
Autosave draft
Show last saved time
Conflict detection
Version history
```

Manual save is safer for MVP.

---

# 153. Collaboration Strategy

Future collaboration features:

```text
Multiple users viewing workflow
Presence indicators
Comments
Review requests
Workflow locks
Change history
```

MVP does not need real-time collaborative editing.

---

# 154. Keyboard Shortcuts

Useful shortcuts:

```text
Ctrl/Cmd + S = Save
Delete = Delete selected node
Ctrl/Cmd + Z = Undo
Ctrl/Cmd + Shift + Z = Redo
Space = Pan mode
Ctrl/Cmd + Enter = Run workflow
F = Fit view
```

Show shortcuts in help menu.

---

# 155. Help and Documentation UX

Help should be contextual.

Examples:

```text
Node documentation in property panel
Workflow template explanation
Tooltip for permissions
Execution error suggestions
AI output explanation
```

---

# 156. Product Copy Examples

## Run Workflow

```text
Run this workflow using the selected version and inputs.
```

## Validate Workflow

```text
Check whether this workflow is ready to run.
```

## Human Approval

```text
This step pauses the workflow until an authorized user makes a decision.
```

## AI Confidence

```text
Confidence shows how certain the AI model is about this result. Low confidence should be reviewed.
```

---

# 157. Error Copy Examples

## Missing Pack

```text
This workflow needs QS Pack, but it is not installed.
Ask an admin to install the Pack before running this workflow.
```

## Missing BOQ File

```text
Please upload a BOQ file before running this workflow.
```

## Approval Required

```text
This workflow is waiting for approval from Procurement Manager.
```

## AI Low Confidence

```text
AI confidence is below your threshold. Review is required before continuing.
```

---

# 158. Security UX

Security should be visible but not frightening.

Show:

```text
Pack permissions
Workflow permissions
External actions
AI data policy
Secret references
Audit log links
```

---

# 159. Permission Request UX

When a workflow needs permission:

```text
This workflow requires:
- document.generate
- ai.invoke
- workflow.pause

[Request Admin Approval]
```

---

# 160. Data Privacy UX

For AI and documents:

```text
This document may contain commercial-sensitive data.
Confirm that AI processing is allowed for this project.
```

Organization settings can define defaults.

---

# 161. Internationalization

QS-OS should support localization.

Recommended first languages:

```text
English
Bahasa Melayu
Bahasa Indonesia
Arabic later
```

UI text should be externalized.

---

# 162. Date, Time, Currency Formatting

Use organization/project settings.

Examples:

```text
Timezone: Asia/Kuala_Lumpur
Currency: MYR
Date format: DD/MM/YYYY or organization preference
```

---

# 163. Accessibility Checklist

```text
[ ] Keyboard navigation works
[ ] Focus states visible
[ ] Color contrast acceptable
[ ] Buttons have text labels or aria labels
[ ] Forms have labels
[ ] Errors are connected to fields
[ ] Modals trap focus
[ ] Tables have headers
[ ] Statuses use text + icon
[ ] Canvas has non-canvas alternative views where possible
```

---

# 164. MVP UI Build Order

Recommended order:

```text
1. App shell
2. Login and organization context
3. Dashboard
4. Project list and project detail
5. Document upload
6. Workflow list
7. Workflow editor shell
8. Node library
9. Property panel
10. Workflow save/load
11. Validation panel
12. Run workflow modal
13. Execution viewer
14. Approval inbox
15. Approval detail
16. Packs installed page
17. Admin settings
```

---

# 165. UI/UX Relationship to API

UI uses API endpoints from Volume 8.

Examples:

```text
Project page → /projects
Workflow editor → /workflows/:id/versions
Node library → /nodes
Run button → /workflows/:id/run
Execution viewer → /executions/:id
Approval inbox → /approvals
Documents page → /documents
Packs page → /packs/installed
```

---

# 166. UI/UX Relationship to Database

UI does not access database directly.

UI reads through API.

Database supports:

```text
Projects
Workflows
Workflow versions
Executions
Logs
Artifacts
Approvals
Documents
Packs
Nodes
AI usage
Audit
```

---

# 167. UI/UX Relationship to Workflow JSON

Workflow editor serializes canvas state into Workflow JSON.

Important:

```text
Canvas position goes to node.position
Node config goes to node.configuration
Connections go to connections array
Variables go to variables
Triggers go to triggers
Workflow metadata goes to workflow object
```

---

# 168. UI/UX Relationship to Execution Engine

Execution viewer reflects engine state.

UI should not fake execution status.

It should receive:

```text
Execution status
Node execution status
Logs
Outputs
Artifacts
Approval tasks
Errors
Progress
```

---

# 169. UI/UX Relationship to Packs

Node library is generated from installed Packs.

Pack page manages:

```text
Installed Packs
Registered nodes
Pack permissions
Pack templates
Pack prompts
Pack configuration
```

---

# 170. Future UI Extensions

Future screens:

```text
Marketplace
Supplier portal
BIM viewer
Workflow diff viewer
Workflow comments
AI agent chat
Cost database
Rate library
Quotation comparison dashboard
Contract administration dashboard
Mobile approval app
Enterprise policy console
```

---

# 171. UI Anti-Patterns

Avoid:

```text
Showing too many technical fields to normal QS users
Making workflow canvas the only way to understand execution
Hiding errors inside logs only
Using generic labels instead of QS terms
Allowing high-risk action without confirmation
Making AI output look final without review
Overloading dashboard with too many widgets
Poor empty states
No clear save status
No visible validation status
```

---

# 172. MVP Product Experience Goal

The MVP should make users feel:

```text
I can upload a BOQ.
I can see a workflow.
I can run it.
I can understand what happened.
I can approve before anything important happens.
I can download the result.
I can trust the audit trail.
```

---

# 173. Relationship to Other Volumes

This volume connects to:

```text
Volume 1 – Workflow Engine Blueprint
UI expresses the visual workflow philosophy.

Volume 2 – QS Node SDK Specification
UI renders nodes based on node metadata, ports, configuration, and UI schema.

Volume 2.1 – QS Node Developer Guide
UI supports documentation, node validation, and developer mode.

Volume 3 – QS Pack Specification
UI manages installed Packs, Pack permissions, Pack nodes, templates, and prompts.

Volume 4 – Workflow JSON Specification
UI saves and loads Workflow JSON.

Volume 5 – Execution Engine Specification
UI displays execution progress, logs, artifacts, approvals, and errors.

Volume 6 – Product Master Blueprint V2
UI implements the product modules and MVP journey.

Volume 7 – Database Schema Specification
UI reads database-backed data through APIs.

Volume 8 – API Specification
UI communicates with backend through defined API endpoints.
```

---

# 174. Recommended Next Specification

After UI/UX Product Specification, prepare:

```text
Volume 10 – MVP Sprint Backlog
```

Purpose:

```text
Convert Volumes 1–9 into actionable development tasks.
```

Recommended after Volume 10:

```text
Volume 11 – AI Governance and Prompt Specification
Volume 12 – Security and Permission Specification
```

---

# 175. Final Formula

```text
QS-OS UI/UX =
  Dashboard
  + Project Workspace
  + Workflow Canvas
  + Node Library
  + Property Panel
  + Execution Viewer
  + Approval Inbox
  + Documents
  + Packs
  + Admin
```

```text
The UI is the layer where QS professionals experience the power of the workflow engine without needing to understand the engine.
```

---

# Conclusion

The UI/UX Product Specification defines how QS-OS becomes usable, understandable, trustworthy, and valuable.

The core experience is:

```text
Create project
Upload BOQ
Build or select workflow
Run workflow
Watch execution
Review AI output
Approve key steps
Download generated documents
Trace everything through logs and audit history
```

For MVP, the UI should focus on the BOQ-to-RFQ journey.

Do not overload users with every future module.

Start with a clear workflow builder, reliable execution viewer, simple approval inbox, and document output experience.

QS-OS becomes powerful when users can visually build and run construction workflows with confidence.
