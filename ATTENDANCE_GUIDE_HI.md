# Attendance: Simple + Fingerprint machine (Hindi)

## Class aur section kaise alag rahenge
- Har student record mein `school_id`, `class_name`, `section`, `roll_number` aur `admission_number` hona chahiye.
- Simple attendance mein School Admin/Teacher school, class, section aur date select karta hai. `All sections` chunne par us class ke sab sections ek saath dikhte hain; A ya B chunne par sirf wahi section aata hai.
- Attendance har student ke unique `student_id` ke saath save hoti hai, isliye ek hi school ki Class 1-A aur Class 1-B mix nahi hoti.
- Machine CSV import mein student ko admission number se match karna behtar hai. Roll number sirf tab accept hoga jab poore school mein unique ho; duplicate roll numbers ko import preview mein reject kiya jayega.

## Fingerprint machine ka actual flow
1. School ek compatible biometric terminal ko main gate/reception par lagata hai. Machine ka ek hona sab students ke liye kaafi ho sakta hai; alag-alag class ke liye alag machine zaroori nahi.
2. Admin har student ko machine mein ek baar enroll karta hai. Machine fingerprint ka template apne secure device mein rakhti hai aur usko ek unique Machine User ID/Enrollment ID deti hai. Fingerprint image ko ERP mein store karna zaroori nahi aur ise avoid karna chahiye.
3. ERP ke Students record mein us Machine User ID ko Admission Number/student record se map karna hoga. Abhi is ZIP mein device ID mapping aur live device connector configured nahi hai.
4. Student subah ungli scan karta hai. Machine match hone par event banati hai: Machine User ID + date/time + device ID.
5. Vendor software/API se event ERP tak aata hai. ERP Machine User ID ko student se match karta hai; student ke saved class/section se class register decide hota hai. Isliye machine ko class ka pata hona zaroori nahi.
6. Ek din mein pehli valid entry Present, configured late cutoff ke baad Late, aur baad ki scan ko duplicate/in-out event maana ja sakta hai. Absent ko school ke cutoff ke baad un students ke liye calculate karna chahiye jinka event nahi aaya. Ye automation abhi configured nahi hai.

## Abhi is build mein kya hai / kya nahi
- Available: class + section-wise manual attendance; exported machine CSV import; preview; student matching by admission number (or unique roll number); unknown/ambiguous rows skipped.
- Not available yet: direct live fingerprint device connection, fingerprint enrollment UI, device-to-student ID mapping table, automatic absent/late rules, real-time sync. Ye machine brand/model, firmware, vendor API/SDK aur network support par depend karega.
- Kisi bhi fingerprint machine ko kharidne se pehle vendor se written confirmation lein: API/SDK access, attendance log export/API, unique user ID, LAN/Wi-Fi support, India data/privacy handling, and integration documentation.
