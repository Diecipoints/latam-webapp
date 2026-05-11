## ADDED Requirements

### Requirement: Result registration
The system SHALL allow managers to register Results for an Objective. A Result has: ResultId, ObjectiveId, ResultActualValue (decimal), ResultDelta (decimal), ResultAchievementPct (decimal 0–100+), ResultQlikImageUrl (nullable), ResultPdfUrl (nullable).

#### Scenario: Create a result for an objective
- **WHEN** a manager submits a result with an existing ObjectiveId, a numeric ResultActualValue, a numeric ResultDelta, and a numeric ResultAchievementPct
- **THEN** the system persists the result and returns it with a generated ResultId

#### Scenario: Create result with invalid objective
- **WHEN** a manager submits a result referencing an ObjectiveId that does not exist
- **THEN** the system rejects the request with a validation error

#### Scenario: ResultAchievementPct must be a non-negative number
- **WHEN** a manager submits a result with a negative ResultAchievementPct
- **THEN** the system rejects the request with a validation error

### Requirement: Result evidence links
The system SHALL allow managers to attach a Qlik image URL and a PDF URL to a Result as optional evidence.

#### Scenario: Attach Qlik image URL
- **WHEN** a manager sets a valid URL for ResultQlikImageUrl on a result
- **THEN** the system stores the URL and returns it in subsequent reads

#### Scenario: Attach PDF URL
- **WHEN** a manager sets a valid URL for ResultPdfUrl on a result
- **THEN** the system stores the URL and returns it in subsequent reads

#### Scenario: Clear evidence URL
- **WHEN** a manager sets ResultQlikImageUrl or ResultPdfUrl to null
- **THEN** the system stores null and the field is absent from subsequent read responses

### Requirement: Result update
The system SHALL allow managers to update all fields of an existing Result.

#### Scenario: Update result values
- **WHEN** a manager submits updated numeric values for ResultActualValue, ResultDelta, or ResultAchievementPct
- **THEN** the system persists the updated values

### Requirement: Result retrieval by objective
The system SHALL allow users to retrieve all Results associated with a given ObjectiveId.

#### Scenario: List results for an objective
- **WHEN** a user requests results filtered by a specific ObjectiveId
- **THEN** the system returns all results for that objective ordered by ResultId ascending

#### Scenario: List results for objective with no results
- **WHEN** a user requests results for an ObjectiveId that has no associated results
- **THEN** the system returns an empty list

### Requirement: Result deletion
The system SHALL allow managers to delete a Result by ResultId.

#### Scenario: Delete a result
- **WHEN** a manager deletes an existing result by its ResultId
- **THEN** the system removes the result and returns a success confirmation

#### Scenario: Delete non-existent result
- **WHEN** a manager attempts to delete a ResultId that does not exist
- **THEN** the system returns a 404 not found error
