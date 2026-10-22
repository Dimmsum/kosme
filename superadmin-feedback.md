User Verification / User Management – Role-Specific Management

Please add School Admin as an additional user role.

The Manage User screen should change according to the user’s role. Right now Student, Educator, Client and Employer are all being shown Institution / Programme / Cohort / Account Status, although those fields do not apply equally to every user type.

Suggested role-specific management:

Student

Institution
Programme
Cohort
Student ID
Account status
View progress/service record
Suspend/deactivate/remove account
Educator

Institution
Programme(s) assigned
Cohort(s) assigned
Educator/Staff ID if used
Account status
View assigned students
Suspend/deactivate/remove account
An educator may teach across multiple programmes or cohorts, so these should allow multiple assignments rather than a single dropdown selection.

School Admin

Institution
Programmes they can administer, where applicable
Account status
Administrative permissions/access level
Suspend/deactivate/remove account
Client / Volunteer Client

Contact/profile details
Parish/location
Services volunteered for
Availability
Volunteer status/approval status
Account status
Service/appointment history
Suspend/deactivate/remove account
I can currently suspend a user, but I also need a way to delete/remove a user. Deletion should have a layered confirmation process for security, for example: Delete User → warning showing what records will be affected → final confirmation. We may also need to distinguish between deactivating/suspending an account and permanently deleting one where records must be retained.

Institutions, Programmes & Cohorts: When adding a programme, more programme-specific information is needed, such as programme name, certification/qualification type, level, duration, awarding body, start/end dates and status. I also need to understand how programme and cohort capacity will be configured, especially since schools may eventually be charged based on number of programmes and/or cohort size. Super Admin should be able to see what each institution’s subscription/allocation permits and its current usage.

Service Requirements – Required Count / Required Hours

I have clarified how I want this structured.

The Master Service Catalogue should define the service itself, while curriculum completion requirements should be configured separately.

Required Count means the number of qualifying times a student must perform a particular service. This requirement may differ by programme, institution and curriculum version, so it should live under Programme Requirements, rather than permanently on the master service.

Recommended Duration should remain attached to the service and represents the normal expected time range for completing that service.

Verified Hours should be generated from the student's actual recorded service time.

Required Hours should be configurable only where the programme requires minimum practical hours. These may apply at programme level, category level or service level depending on the curriculum.

Super Admin should remain within the Super Admin account and be able to configure a programme requirement set and apply it to one institution, multiple selected institutions, or all institutions offering that programme.

Suggested structure:

Master Service Catalogue → Programme/Curriculum Requirements → Institution Assignment → Cohort → Student Progress

Cohorts should inherit the requirements applicable when that cohort begins. Future curriculum changes should be applied using an effective cohort/date, so changes for future students do not alter the completion requirements of existing cohorts.

I would also like the ability to create a reusable programme template, assign it to several institutions, and allow institution-specific variations where required.

Service Catalogue: I want the ability to edit the colour assigned to each category heading so categories are easier to distinguish visually. When creating a new category, why is the ID locked after creation? Please clarify the purpose of the ID and whether administrators ever need to interact with it. The field currently called Label is actually the visible category heading, which is unclear from the wording; rename it to something like Category Name/Display Name. A category description would also be useful.

Service Catalogue Organisation: Rather than displaying one very long list of service categories/types, could the catalogue be grouped under broader collapsible sections such as Hair, Skin, Nails, Makeup, Barbering, Spa/Body, etc.? Super Admin could expand only the section being worked on.

Educator Assignments: I think educator assignments should sit within Institutions & Cohorts rather than existing as a completely separate area. Educators are assigned within a school context, so the flow could be Institution → Programme → Cohort → Educators → Students. This would make it much clearer which educator is responsible for which cohort/programme.

Volunteer Client / Booking Workflow – Revised

I want the client process to work around service requests and bookings, rather than requiring School Admin approval for every client relationship.

There are several ways a student may get a client:

1. Student needs a volunteer client
   Student searches the Kosmè volunteer pool → selects a suitable client → sends a service/appointment request → client accepts, declines or proposes another time.

2. Volunteer client wants a service
   Client searches available services/students → views the student’s portfolio → sends a booking/service request → student accepts, declines or proposes another time.

3. Student brings their own client
   Student selects Add My Client → enters/invites the client → creates the service/appointment → client receives the request and confirms the booking.

Therefore, Pending should identify a booking awaiting a response. Please make the status specific:

Pending Student Response
Pending Client Response
Confirmed
Reschedule Requested
Cancelled
Service Completed
Awaiting Client Confirmation

Once both parties agree to the appointment, it becomes Confirmed and appears under their upcoming services.

The person receiving the request should be the person who accepts it:

Student → Client request: Client accepts.
Client → Student request: Student accepts.
Student adds own client: Client confirms the appointment.

School Admin and Educator should have visibility of bookings connected to their institution/cohort and be able to intervene or flag issues where required, while routine booking acceptance remains between the student and client.

After the appointment:

Service starts → timer/evidence captured → student completes service → client confirms service took place → submission moves to educator verification.

Employer Management: The employer-management area needs more information about each employer, for example business name, contact person, location, business type, verification/status and activity. Super Admin should also be able to suspend employer access, reactivate access and manage employer accounts in the same controlled way as other user types.

Practical Submissions: Practical submissions need stronger organisation. Super Admin should be able to filter and view submissions by Institution → Programme → Cohort → Student, as well as by service category, status and date. With multiple schools using Kosmè, a single combined submissions list will become difficult to manage very quickly.
