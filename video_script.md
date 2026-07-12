# TransitOps-odoo: 5-7 Minute Demonstration Video Script

This script guides you through demonstrating the TransitOps platform. It spans approximately 5 to 7 minutes and showcases all 9 required workflow steps, including user actions, visual cues, and narration.

---

## 🎬 Act 1: Introduction & Platform Setup (0:00 - 0:45)

### 🖥️ Visuals
- Screen opens on the **TransitOps Login Page**.
- Show the interactive **Demo Account Select Grid** at the bottom.

### 🖱️ Action Cues
1. Point your cursor to the role selection grid.
2. Click on the **Dispatcher** role card (pre-fills credentials).
3. Click the **"Sign In to Fleet"** button to log in.
4. The dashboard transitions to the **Smart Dashboard**.

### 🎙️ Voiceover / Audio
> "Welcome to this demonstration of TransitOps, our enterprise control system built for modern fleet operations and compliance management. Today, we're going to walk through a complete end-to-end logistics lifecycle. Let's begin by signing in using our preset Dispatcher account."

---

## 🚗 Act 2: Registering Assets (0:45 - 2:15)

### 🖥️ Visuals
- Sidebar menu. Transition to the **Vehicle Registry** page.
- Click **"Add Vehicle"** button.

### 🖱️ Action Cues (Step 1)
1. In the sidebar, click **Vehicle Registry**.
2. Click **Add Vehicle** (top right) to open the creation modal.
3. Fill in the following details:
   - **Reg Number:** `MH-12-VN-0505`
   - **Model Name:** `Van-05`
   - **Manufacturer:** `Tata Motors`
   - **Vehicle Type:** Select `Van`
   - **Region:** Select `Maharashtra Hub`
   - **Maximum Capacity (kg):** Enter `500`
   - **Odometer (km):** Enter `12000`
   - **Acquisition Cost (INR):** Enter `365000`
   - **Status:** Select `Available`
4. Click **Finalize Log Entry**.
5. Point out `Van-05` in the table, noting that its Daily Cost is correctly calculated as `₹1,000/day` based on the acquisition cost.

### 🎙️ Voiceover / Audio
> "First, let's onboard a new vehicle to our fleet. We navigate to the Vehicle Registry and click Add Vehicle. We register our vehicle, 'Van-05' with a maximum cargo weight capacity of 500 kg. We assign its status as Available. You'll notice that the system immediately calculates a Daily Cost Estimate of ₹1,000/day based on its recovery period. Our asset is now registered and ready."

---

### 🖥️ Visuals
- Transition to the **Driver Management** page.
- Click **"Onboard New Driver"** card.

### 🖱️ Action Cues (Step 2)
1. Click **Driver Management** in the sidebar.
2. Click the **Onboard New Driver** card.
3. Fill in the details:
   - **Name:** `Alex`
   - **Phone:** `+91 98765 43210`
   - **Email:** `alex@transitops.com`
   - **License Number:** `DL-1420260789012`
   - **License Expiry:** Select a date in the future (e.g., next year)
   - **Region:** Select `Maharashtra Hub`
   - **Safety Score:** `95`
4. Click **Finalize Log Entry**.
5. Point out the valid driving license tag next to Alex's profile.

### 🎙️ Voiceover / Audio
> "Next, we need an operator. We navigate to Driver Management and onboard our driver, 'Alex'. We input his phone, email, and valid driving license credentials. Once finalized, Alex is registered as an Available operator with a high safety score of 95."

---

## 🛣️ Act 3: Trip Dispatch & Capacity Validation (2:15 - 3:45)

### 🖥️ Visuals
- Transition to the **Trip Dispatcher** page.
- Focus on the **New Trip Configuration** form.

### 🖱️ Action Cues (Step 3 & 4)
1. Click **Trip Dispatcher** in the sidebar.
2. Fill in the New Trip Configuration form:
   - **Source Hub:** Select `Maharashtra Hub`
   - **Destination:** Enter `Gujarat Delivery Hub`
   - **Planned Distance:** Enter `150`
   - **Assigned Vehicle:** Select `Van-05 (MH-12-VN-0505)`
   - **Assigned Driver:** Select `Alex`
   - **Cargo Weight (kg):** Enter `450`
3. Click the **DISPATCH TRIP** button.
4. Point out the success banner.
5. In the bottom-right corner, click on the **Mock SMTP Email Client** floating widget to show that a dispatch email alert was triggered containing the trip and cargo specifications.

### 🎙️ Voiceover / Audio
> "Now, let's schedule a shipment. Under our New Trip Configuration, we define the route from Maharashtra to Gujarat. We assign vehicle 'Van-05' and driver 'Alex'. We enter our Cargo Weight as 450 kg. Because 450 kg is less than or equal to our vehicle's maximum capacity of 500 kg, the system validates the request and permits the dispatch. Clicking Dispatch instantly alerts the driver and logs the event on our SMTP email server, visible in the bottom-right corner."

---

### 🖥️ Visuals
- Show the **Recent & Active Trips** table on the Trip Dispatcher page.
- Navigate briefly back to **Vehicle Registry** and **Driver Management**.

### 🖱️ Action Cues (Step 5)
1. Point to the dispatched trip in the table (shows state `Dispatched`).
2. Navigate to **Vehicle Registry** and find `Van-05` (shows status `On Trip`).
3. Navigate to **Driver Management** and find `Alex` (shows status `On Trip`).

### 🎙️ Voiceover / Audio
> "Once dispatched, the platform handles asset locking automatically. If we inspect our registries, both vehicle 'Van-05' and driver 'Alex' have transitioned their status to 'On Trip', preventing them from being double-allocated to other shipments."

---

## 🏁 Act 4: Completing the Shipment (3:45 - 5:00)

### 🖥️ Visuals
- Transition back to **Trip Dispatcher**.
- Click the `more_vert` actions button on the active trip and select **Complete**.

### 🖱️ Action Cues (Step 6 & 7)
1. In Trip Dispatcher, find the dispatched trip row.
2. Click the **Three Dots Menu** (`more_vert`) and select **Complete**.
3. In the Completion Modal, enter:
   - **Final Odometer Reading (km):** Enter `12150` (Start 12,000 + 150 km distance)
   - **Fuel Consumed (litres):** Enter `15`
4. Click **Finalize Log Entry**.
5. Navigate to **Vehicle Registry** and **Driver Management** to show that both `Van-05` and `Alex` are now back to `Available`.

### 🎙️ Voiceover / Audio
> "When the shipment arrives, the driver completes the trip log. We launch the completion module and submit the final odometer reading of 12,150 km and 15 litres of fuel consumed. Upon finalization, the system logs the operational data and automatically resets both the vehicle and driver status back to 'Available'."

---

## 🔧 Act 5: Scheduling Maintenance (5:00 - 6:00)

### 🖥️ Visuals
- Transition to the **Maintenance** page.
- Focus on the **Schedule Maintenance** form.

### 🖱️ Action Cues (Step 8)
1. Click **Maintenance** in the sidebar.
2. Under the Schedule Maintenance card:
   - **Select Vehicle:** Select `Van-05`
   - **Service Category:** Select `Oil Change`
   - **Cost (INR):** `2500`
   - **Date:** Today's Date
   - **Internal Notes:** Enter `Scheduled oil replacement and air filter check.`
3. Click **Finalize Log Entry**.
4. Check the **Vehicle Registry** page to show `Van-05` is now `In Shop`.
5. Go back to the **Trip Dispatcher** page, open the vehicle dropdown, and show that `Van-05` is hidden from selection.

### 🎙️ Voiceover / Audio
> "Let's perform scheduled maintenance on our van. On the Maintenance page, we check vehicle 'Van-05' in for an Oil Change. Saving this log immediately updates the vehicle's status to 'In Shop' and dispatches an SMTP shop alert. If we go to dispatch a new trip, 'Van-05' is safely hidden from the available vehicle pool, preventing out-of-service dispatches."

---

## 📈 Act 6: Reports & Analytics (6:00 - 7:00)

### 🖥️ Visuals
- Transition to the **Reports** page.
- Point to the KPI Cards and the Ledger.

### 🖱️ Action Cues (Step 9)
1. Click **Reports** in the sidebar.
2. Point out:
   - **Fuel Efficiency card:** Updated averages.
   - **Operational Cost card:** Reflecting the fuel and maintenance logs.
3. Click **Download Strategy PDF Report** to show PDF generation is functional.

### 🎙️ Voiceover / Audio
> "Finally, we inspect our Reports and Analytics. The dashboard dynamically updates our operational cost ledger and fuel efficiency averages (currently at 10 km/L) based on the 150 km trip and 15-litre fuel log we just entered. Managers can instantly export the strategic audit data as a high-resolution PDF. That concludes our walk-through. Thank you."

---
