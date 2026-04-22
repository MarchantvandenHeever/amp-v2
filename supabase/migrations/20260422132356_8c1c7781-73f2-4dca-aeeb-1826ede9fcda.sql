-- Unlock any locked task with no predecessor
UPDATE public.journey_items
SET status = 'available', updated_at = now()
WHERE status = 'locked' AND predecessor_id IS NULL;

-- Unlock any locked task whose predecessor is already completed
UPDATE public.journey_items ji
SET status = 'available', updated_at = now()
FROM public.journey_items pred
WHERE ji.status = 'locked'
  AND ji.predecessor_id = pred.id
  AND pred.status = 'completed';