## ADDED Requirements

### Requirement: Period management
The system SHALL allow administrators to create, read, update, and delete Periods. A Period has a unique PeriodId, a PeriodDescription, and a PeriodYear (integer).

#### Scenario: Create a period
- **WHEN** an administrator submits a new period with a valid PeriodDescription and PeriodYear
- **THEN** the system persists the period and returns it with a generated PeriodId

#### Scenario: List periods ordered by year
- **WHEN** a user requests the list of periods
- **THEN** the system returns all periods ordered by PeriodYear descending

### Requirement: ObjectiveTemplate management
The system SHALL allow administrators to create, read, update, and delete ObjectiveTemplates. A template has a unique ObjectiveTemplateId, an ObjectiveTemplateTitle, and an ObjectiveTemplateBody (rich text).

#### Scenario: Create an objective template
- **WHEN** an administrator submits a template with a valid ObjectiveTemplateTitle and ObjectiveTemplateBody
- **THEN** the system persists it and returns it with a generated ObjectiveTemplateId

#### Scenario: List all objective templates
- **WHEN** a user requests the list of templates
- **THEN** the system returns all templates ordered by ObjectiveTemplateTitle

### Requirement: Objective assignment
The system SHALL allow managers to create and manage Objectives, which assign a collaborator to a period with a defined status and optional document URLs.

An Objective has: ObjectiveId, CollaboratorId, PeriodId, ObjectiveStatus (enum: DRAFT | ASSIGNED | SIGNED | CLOSED), ObjectiveWordURL (nullable), ObjectiveSignedPdfURL (nullable).

#### Scenario: Create an objective
- **WHEN** a manager submits a new objective with an existing CollaboratorId, an existing PeriodId, and a valid ObjectiveStatus
- **THEN** the system persists the objective and returns it with a generated ObjectiveId

#### Scenario: Create objective with invalid collaborator
- **WHEN** a manager submits an objective referencing a CollaboratorId that does not exist
- **THEN** the system rejects the request with a validation error

#### Scenario: Create objective with invalid period
- **WHEN** a manager submits an objective referencing a PeriodId that does not exist
- **THEN** the system rejects the request with a validation error

#### Scenario: Update objective status
- **WHEN** a manager updates the ObjectiveStatus of an existing objective to a valid enum value
- **THEN** the system persists the new status

#### Scenario: Attach Word document URL
- **WHEN** a manager sets a valid URL for ObjectiveWordURL on an existing objective
- **THEN** the system stores the URL and the value is returned in subsequent reads

#### Scenario: Attach signed PDF URL
- **WHEN** a manager sets a valid URL for ObjectiveSignedPdfURL on an existing objective
- **THEN** the system stores the URL and the value is returned in subsequent reads

#### Scenario: List objectives by collaborator and period
- **WHEN** a user requests objectives filtered by CollaboratorId and PeriodId
- **THEN** the system returns all objectives matching both filters

#### Scenario: List objectives by status
- **WHEN** a user requests objectives filtered by ObjectiveStatus
- **THEN** the system returns only objectives with that status

### Requirement: Objective deletion guard
The system SHALL prevent deletion of an Objective that has associated Results.

#### Scenario: Delete objective with results
- **WHEN** a manager attempts to delete an objective that has one or more associated Results
- **THEN** the system rejects the deletion with an error indicating dependent results exist

#### Scenario: Delete objective without results
- **WHEN** a manager deletes an objective that has no associated results
- **THEN** the system removes the objective successfully
