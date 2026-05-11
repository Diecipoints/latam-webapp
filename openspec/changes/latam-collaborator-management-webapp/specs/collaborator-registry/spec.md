## ADDED Requirements

### Requirement: Region management
The system SHALL allow administrators to create, read, update, and delete Regions. A Region has a unique RegionId and a RegionName.

#### Scenario: Create a region
- **WHEN** an administrator submits a new region with a valid RegionName
- **THEN** the system persists the region and returns it with a generated RegionId

#### Scenario: List all regions
- **WHEN** a user requests the list of regions
- **THEN** the system returns all regions ordered by RegionName

#### Scenario: Delete a region with associated countries
- **WHEN** an administrator attempts to delete a region that has associated countries
- **THEN** the system rejects the deletion with an error indicating dependent countries exist

### Requirement: Country management
The system SHALL allow administrators to create, read, update, and delete Countries. A Country has a unique CountryId, a CountryName, and belongs to exactly one Region (RegionId).

#### Scenario: Create a country linked to a region
- **WHEN** an administrator submits a new country with a valid CountryName and an existing RegionId
- **THEN** the system persists the country and returns it with a generated CountryId

#### Scenario: Create a country with invalid region
- **WHEN** an administrator submits a country with a RegionId that does not exist
- **THEN** the system rejects the request with a validation error

#### Scenario: List countries by region
- **WHEN** a user requests countries filtered by a specific RegionId
- **THEN** the system returns only countries belonging to that region

### Requirement: CollaboratorType management
The system SHALL allow administrators to create, read, update, and delete CollaboratorTypes. A CollaboratorType has a unique CollaboratorTypeId and a CollaboratorTypeName.

#### Scenario: Create a collaborator type
- **WHEN** an administrator submits a new collaborator type with a valid CollaboratorTypeName
- **THEN** the system persists it and returns it with a generated CollaboratorTypeId

#### Scenario: Delete a collaborator type in use
- **WHEN** an administrator attempts to delete a CollaboratorType that is assigned to one or more Collaborators
- **THEN** the system rejects the deletion with an error indicating it is in use

### Requirement: Collaborator management
The system SHALL allow administrators to create, read, update, and deactivate Collaborators. A Collaborator has a CollaboratorId, CollaboratorName, CollaboratorEmail, CollaboratorActive flag, and belongs to exactly one CollaboratorType and one Country.

#### Scenario: Create a collaborator
- **WHEN** an administrator submits a new collaborator with valid name, email, existing CollaboratorTypeId, and existing CountryId
- **THEN** the system persists the collaborator as active (CollaboratorActive = true) and returns it with a generated CollaboratorId

#### Scenario: Duplicate email rejected
- **WHEN** an administrator submits a collaborator with an email already used by another collaborator
- **THEN** the system rejects the request with a duplicate email error

#### Scenario: Deactivate a collaborator
- **WHEN** an administrator sets CollaboratorActive to false for an existing collaborator
- **THEN** the system updates the record and the collaborator no longer appears in active-only lists

#### Scenario: List active collaborators
- **WHEN** a user requests the list of collaborators with filter active=true
- **THEN** the system returns only collaborators where CollaboratorActive is true

#### Scenario: Filter collaborators by country
- **WHEN** a user requests collaborators filtered by a specific CountryId
- **THEN** the system returns only collaborators belonging to that country

#### Scenario: Filter collaborators by type
- **WHEN** a user requests collaborators filtered by a specific CollaboratorTypeId
- **THEN** the system returns only collaborators of that type
