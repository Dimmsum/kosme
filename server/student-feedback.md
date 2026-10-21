1. When logging a new service, the form displays the Service Name and Category correctly, but submission returns:

API 400: {"error":"name and category_id are required"}

2. Photo upload bug – Student Service Evidence

Photo selection works and the image appears under Ready to upload, but clicking Upload 1 photo returns:

“Could not upload your photos. Please try again.”

3. Timer issue – Start Service

When I click Start Service / Start Timer, there is no visible confirmation that the timer has started. No timer, banner, pop-up, status change, or running-time indicator appears on the page.

I later discovered that the timer had actually started and was continuing to run on another page.

Once the student starts a service, there should be immediate confirmation and the active timer should remain visible throughout Kosmè until it is stopped.

Suggested behaviour:

Button changes immediately from Start Service to Stop Service.
Show a live timer, e.g. Service in progress — 00:14:37.
Display a persistent timer bar/header if the student navigates to another page.
Clearly identify which service is being timed.
Prevent a second service timer from starting while one is already active, or warn the student first.
If the student logs out/closes the browser and returns, the timer should restore from the server start time.
Provide a clear Stop Service action wherever the active timer is displayed.

I would also add one small status message immediately after they click:

Timer started — Rope Twist is now being recorded.

4. My Progress – full practical list is hard to view

On the My Progress page, I can see the overall total (4/63 completed) and category summaries such as:

Blow-dry — 1/8
Braiding — 1/5
Colour — 1/10
Haircuts — 1/15
But I need a clear way to see the full list of all 63 required practical services, including what has been completed and what is still outstanding.

Please add an expanded “View all required practicals” section or page.

Each category should expand to show the individual required services, for example:

Braiding — 1/5

Box Braids — Completed
Rope Twist — Outstanding
Cornrows — Outstanding
Knotless Braids — Outstanding
Feed-in Braids — Outstanding
Students should be able to quickly see:

every required practical;
completed services;
outstanding services;
services awaiting client confirmation;
services awaiting educator verification;
progress within each category.
Ideally, clicking a category card such as Braiding 1/5 should open that category’s full requirement list.

I’d also add a small filter across the top:

All | Outstanding | In Progress | Awaiting Verification | Completed

That would make the 4/63 figure genuinely useful because the student can immediately identify exactly what the other 59 practicals are.

5. Volunteer Page – Functionality

The Volunteer page currently feels like a client listing. I need it to function as the student’s space for finding and coordinating with practice clients.

Please add the ability for a student to:

View the volunteer’s profile and the services they are willing to receive.
See the volunteer’s available days/times.
Send an in-app message to the volunteer.
Select a required practical/service and request an appointment.
Choose the proposed date, time, location and estimated service duration.
Allow the volunteer to Accept, Decline or Suggest Another Time.
Show the appointment status: Pending, Confirmed, Reschedule Requested, Cancelled or Completed.
Display confirmed appointments in an Upcoming Appointments/Schedule area.
Allow the student to message or reschedule from the confirmed appointment.
On the appointment date, allow the student to open the booking and Start Service/Start Timer directly from there.
The ideal flow is:

Find Volunteer → View Availability → Message → Request Appointment → Client Confirms → Appointment Added to Schedule → Start Service → Client Confirms Completion → Educator Verification

Please keep communication inside Kosmè as much as possible so students and volunteer clients can coordinate without immediately sharing personal phone numbers.

6. Entry requiring correction - could figure out how to update the entry.

7. Awaiting client took me back to my recent service.
