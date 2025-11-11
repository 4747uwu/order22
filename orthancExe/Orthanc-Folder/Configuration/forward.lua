function OnStableSeries(seriesId, tags, metadata)

 if (metadata['ModifiedFrom'] == nil and 
     metadata['AnonymizedFrom'] == nil) then
	 
	
	local transfer = {}
	transfer['Resources'] = {}
	transfer['Resources'][1] = {}
	transfer['Resources'][1]['Level'] = 'Series'
	transfer['Resources'][1]['ID'] = seriesId
	transfer['Compression'] = 'gzip'
	transfer['Peer'] = 'STARPACS'
   
	local job = ParseJson(RestApiPost('/transfers/send', DumpJson(transfer, true)))
 end
end
