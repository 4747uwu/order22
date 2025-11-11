
PRIVATE_CREATOR = "UJJ1"
PRIVATE_ORGANISATION = "UJJ"
function OnStoredInstance(instanceId, tags, metadata, origin)
   if origin['RequestOrigin'] ~= 'Lua' then

      local replace = {}

      -- Use private creator from JSON
      replace["0013,0010"] = PRIVATE_CREATOR
      replace["0015,0010"] = PRIVATE_CREATOR
      replace["0021,0010"] = PRIVATE_ORGANISATION
      replace["0043,0010"] = PRIVATE_ORGANISATION

      -- Set private tag values
      replace["0013,1060"] = "ab"
      replace["0015,1060"] = "xcentic-fallback-1"
      replace["0021,1060"] = "xcentic-study-key"
      replace["0043,1060"] = "xcentic-link-uuid"
      replace["SOPInstanceUID"] = tags["SOPInstanceUID"]

      local command = {
         ["Replace"] = replace,
         ["Remove"] = {},
         ["Force"] = true
      }

      local modifiedFile = RestApiPost('/instances/' .. instanceId .. '/modify', DumpJson(command, true))
      local uploadResponse = ParseJson(RestApiPost('/instances/', modifiedFile))

      if uploadResponse["Status"] == 'AlreadyStored' then
         print("Are you sure you've enabled 'OverwriteInstances' option ?")
      end

      if uploadResponse["ID"] ~= instanceId then
         print("modified instance and original instance don't have the same Orthanc IDs !")
      end

      print('replaced Private Tag in instance ' .. instanceId)
   end
end
