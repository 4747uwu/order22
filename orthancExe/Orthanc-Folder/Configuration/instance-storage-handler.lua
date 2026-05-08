-- ============================================================================
-- instance-storage-handler.lua
-- ============================================================================
-- 
-- CRITICAL: This script prevents API spam from Orthanc to the Node backend
-- when processing large studies (e.g., 2,400 images).
--
-- Problem: OnStoredInstance fires for EVERY image. Without protection,
--   one study = 2,400 HTTP requests to Node = API exhaustion
--
-- Solution: Memory-locked table tracks which studies we've already notified.
--   Result: 2,400 images = 1 HTTP request ✅
--
-- Configuration:
--   - Orthanc StableAge: 60 seconds (waits for all images in series)
--   - Backend endpoint: http://order22-backend-1:3000/api/orthanc/instance-received
--
-- ============================================================================

-- Global table to remember which studies we've already notified the backend about
-- This acts as a memory lock to prevent duplicate notifications
local pendingStudies = {}

-- ============================================================================
-- OnStoredInstance: Called when an image is stored in Orthanc
-- ============================================================================
function OnStoredInstance(instanceId, tags, metadata, origin)
  -- Skip re-uploaded modified instances (these would have origin = 'Lua')
  if origin['RequestOrigin'] == 'Lua' then
    print('[OnStoredInstance] ✅ Skipping Lua-originated instance (re-upload/modify)')
    return
  end

  local studyUID = tags["StudyInstanceUID"]
  
  -- Only fire the notification once per study
  if studyUID ~= nil and pendingStudies[studyUID] == nil then
    
    -- Lock it immediately to prevent duplicate notifications
    pendingStudies[studyUID] = true
    
    print('[OnStoredInstance] 📥 First image received for study: ' .. studyUID)
    print('[OnStoredInstance] 🔒 Locking study to prevent duplicate notifications')
    
    -- Fire the lightweight notification to Node backend
    local success, err = pcall(function()
      local response = HttpPost(
        "http://order22-backend-1:3000/api/orthanc/instance-received",
        studyUID
      )
      print('[OnStoredInstance] ✅ Notification sent to Node backend for study: ' .. studyUID)
    end)
    
    if not success then
      print('[OnStoredInstance] ⚠️  Failed to notify Node backend: ' .. tostring(err))
      -- Note: We DON'T remove the lock on error, as we don't want to spam retries
    end
    
  else
    if studyUID == nil then
      print('[OnStoredInstance] ⚠️  No StudyInstanceUID found in tags')
    else
      print('[OnStoredInstance] ⏭️  Study ' .. studyUID .. ' already notified, skipping (memory lock active)')
    end
  end
end

-- ============================================================================
-- OnStableStudy: Called when a study becomes stable (no new images for 60s)
-- ============================================================================
function OnStableStudy(studyId, tags, metadata)
  print('[OnStableStudy] ⚙️  Study stabilized: ' .. studyId)
  
  -- Optionally: Remove the memory lock when the study is complete
  -- This frees memory and prevents indefinite lock buildup
  local studyUID = tags["StudyInstanceUID"]
  if studyUID ~= nil then
    if pendingStudies[studyUID] ~= nil then
      pendingStudies[studyUID] = nil
      print('[OnStableStudy] 🔓 Removed lock for study: ' .. studyUID)
    end
  end
  
  -- Send the final stable notification to Node backend
  local success, err = pcall(function()
    HttpPost(
      "http://order22-backend-1:3000/api/orthanc/stable-study",
      studyId
    )
    print('[OnStableStudy] ✅ Final stable notification sent for study: ' .. studyId)
  end)
  
  if not success then
    print('[OnStableStudy] ⚠️  Failed to notify Node backend for stable study: ' .. tostring(err))
  end
end

print('[Script] ✅ instance-storage-handler.lua loaded successfully')
print('[Script] 🔒 Memory-lock system active for instance notifications')
