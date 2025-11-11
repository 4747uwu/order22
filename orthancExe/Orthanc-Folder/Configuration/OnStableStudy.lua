-- function OnStableStudy(studyId, tags, metadata)
--    print('Auto-forwarding stable study: ' .. studyId)

--    -- Get all instances in the study
--    local instances = ParseJson(RestApiGet('/studies/' .. studyId .. '/instances'))

--    for _, instance in ipairs(instances) do
--       local instanceId = instance['ID']
--       print('Sending instance: ' .. instanceId)

--       local success = SendToModality(instanceId, 'RECIEVER_AET')
--       if success then
--          print('SUCCESS: Sent instance to RECIEVER_AET')
--       else
--          print('ERROR: Failed to send instance ' .. instanceId .. ' to RECIEVER_AET')
--       end
--    end
-- end

function OnStableStudy(studyId, tags, metadata)
  -- Send studyId to your Node.js API
  -- We'll wrap this in a protected call for safety, so it won't crash the script if the API is down
  local success, err = pcall(function()
    HttpPost("http://localhost:5000/api/orthanc/stable-study", studyId)
  end)

 
end
