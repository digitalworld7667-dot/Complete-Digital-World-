# School-wide fingerprint attendance — setup plan (Hindi)

## Haan, ek hi machine poore school ke liye
Main gate par ek compatible fingerprint terminal lag sakta hai. Students, teachers aur non-teaching staff sab usi par scan kar sakte hain. Machine class/section decide nahi karti. ERP machine ke `machine_user_id` ko enrollment mapping se person record se match karta hai; student ka class/section `students` table se milta hai.

## Enrollment (one-time)
1. School Admin student/teacher/staff ka record banata hai.
2. Authorized operator machine ke vendor software mein person ko enroll karta hai (fingerprint template machine/vendor system mein rahe; raw fingerprint image ERP mein store na karein).
3. Vendor system ek unique machine user ID deta hai.
4. ERP mapping mein device + person type + person ID + machine user ID save hota hai.
5. Test scan karke mapping verify hoti hai.

## Daily operation
1. Person machine par finger rakhta hai.
2. Machine match karti hai aur event (machine user ID, time, device ID, check-in/out) record karti hai.
3. Vendor API/SDK/agent event ko authenticated server connector tak bhejta hai.
4. Connector machine ID mapping resolve karta hai, duplicate event rokta hai aur correct attendance table mein save karta hai.
5. Student attendance `attendance` mein; teacher attendance `teacher_attendance` mein; other employee attendance `staff_attendance` mein save hoti hai.
6. Student ka class + section uske student record se report mein group hota hai. Teachers/staff employee list mein aate hain.

## Is project build mein
- Added database migration foundation for staff directory, staff attendance, device registry, biometric enrollment mapping and event queue.
- Existing student manual attendance and CSV import remain available.
- No raw fingerprint images/templates are stored in these new tables.
- Direct live fingerprint sync is NOT enabled by this migration. It needs the exact machine brand/model, vendor API/SDK documentation, network capability, and a secure server-side connector/Edge Function. Do not buy a device until vendor confirms API/SDK and event export support in writing.
- Event ingestion is intentionally not open to browser users; only authenticated server-side connector should insert device events.
- Auto-absent and late rules require school-configured working days, holidays, grace period, and check-in/out policy before activation.
