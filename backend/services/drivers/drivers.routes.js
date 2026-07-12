const express = require('express');
const { supabaseAdmin } = require('../../shared/supabase');
const { authenticate } = require('../../shared/middleware/auth');
const { requireRole, requirePermission } = require('../../shared/middleware/rbac');

const router = express.Router();

// GET /api/drivers — List all drivers
router.get('/', authenticate, async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabaseAdmin.from('drivers').select('*');

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('List drivers error:', error);
      return res.status(500).json({ error: 'Failed to fetch drivers' });
    }

    res.json({ drivers: data || [], count: (data || []).length });
  } catch (err) {
    console.error('List drivers exception:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/drivers/:id — Get driver details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('drivers')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Driver not found' });
    }

    res.json(data);
  } catch (err) {
    console.error('Get driver error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/drivers — Create driver (Safety Officer, Fleet Manager, Admin)
router.post(
  '/',
  authenticate,
  requireRole('safety_officer', 'fleet_manager', 'admin'),
  requirePermission('drivers', 'create'),
  async (req, res) => {
    const { name, phone, email, license_number, license_expiry_date } = req.body;

    if (!name || !phone || !license_number || !license_expiry_date) {
      return res.status(400).json({ error: 'Missing required fields: name, phone, license_number, license_expiry_date' });
    }

    try {
      // Check license number uniqueness
      const { data: existing, error: checkError } = await supabaseAdmin
        .from('drivers')
        .select('id')
        .eq('license_number', license_number)
        .limit(1);

      if (checkError) {
        console.error('Driver uniqueness check error:', {
          message: checkError.message,
          code: checkError.code,
          details: checkError.details,
        });
        return res.status(500).json({ 
          error: 'Database error during uniqueness check',
          details: checkError.message 
        });
      }

      if (existing && existing.length > 0) {
        return res.status(400).json({ error: 'License number already exists' });
      }

      const { data: driver, error: driverError } = await supabaseAdmin
        .from('drivers')
        .insert({
          name,
          phone,
          email: email || '',
          license_number,
          license_expiry_date,
          status: 'Available',
          safety_score: 100,
        })
        .select()
        .single();

      if (driverError) {
        console.error('Driver creation error:', {
          message: driverError.message,
          code: driverError.code,
          details: driverError.details,
        });
        return res.status(400).json({ 
          error: 'Driver creation failed',
          details: driverError.message 
        });
      }

      res.status(201).json(driver);
    } catch (err) {
      console.error('Create driver exception:', err.message);
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  }
);

// PUT /api/drivers/:id — Update driver (Safety Officer, Fleet Manager, Admin)
router.put(
  '/:id',
  authenticate,
  requireRole('safety_officer', 'fleet_manager', 'admin'),
  requirePermission('drivers', 'update'),
  async (req, res) => {
    const { name, phone, email, status, safety_score } = req.body;

    try {
      const { data: driver, error: driverError } = await supabaseAdmin
        .from('drivers')
        .select('*')
        .eq('id', req.params.id)
        .single();

      if (driverError || !driver) {
        return res.status(404).json({ error: 'Driver not found' });
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('drivers')
        .update({
          name: name || driver.name,
          phone: phone || driver.phone,
          email: email !== undefined ? email : driver.email,
          status: status || driver.status,
          safety_score: safety_score !== undefined ? safety_score : driver.safety_score,
        })
        .eq('id', req.params.id)
        .select()
        .single();

      if (updateError) {
        return res.status(400).json({ error: updateError.message });
      }

      res.json(updated);
    } catch (err) {
      console.error('Update driver exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;
