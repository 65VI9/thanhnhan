const sourcecodes={
'Notification.lua':`local RunService = game:GetService("RunService")
local TweenService = game:GetService("TweenService")
local Players = game:GetService("Players")

local Remotes = require("./Shared/Remotes")

local Notification = {}

local SLOT_X = 0.333
local SLOT_BASE_Y = 0.234
local SLOT_GAP_Y = 0.043
local MAX_VISIBLE = 5
local DISPLAY_SECONDS = 5
local SLIDE_TWEEN_INFO = TweenInfo.new(0.4, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)

if RunService:IsServer() then
	function Notification.Notify(TargetPlayer, Text, Color, From, Id)
		Remotes.AnnouncementFire:FireClient(TargetPlayer, Text, Color, From, Id)
	end

	function Notification.NotifyAll(Text, Color, From, Id)
		Remotes.AnnouncementFire:FireAllClients(Text, Color, From, Id)
	end
else
	local LocalPlayer = Players.LocalPlayer
	local ActiveQueue = {}

	local function SlotY(SlotIndex)
		return SLOT_BASE_Y + (SlotIndex - 1) * SLOT_GAP_Y
	end

	local function ReflowQueue(RemovedSlotIndex)
		for _, Entry in ActiveQueue do
			if Entry.SlotIndex > RemovedSlotIndex then
				Entry.SlotIndex -= 1
				TweenService:Create(Entry.Label, SLIDE_TWEEN_INFO, {Position = UDim2.new(SLOT_X, 0, SlotY(Entry.SlotIndex), 0)}):Play()
			end
		end
	end

	local function FindEntryById(Id)
		for _, Entry in ActiveQueue do
			if Id and Entry.Id == Id then
				return Entry
			end
		end
		return nil
	end

	local function BuildDisplayText(Text, From)
		if From and From ~= "None" then
			return string.format("[%s] %s", string.upper(From), Text)
		end
		return Text
	end

	local function DespawnEntry(Entry)
		local RemovedIndex = table.find(ActiveQueue, Entry)
		if not RemovedIndex then
			return
		end
		table.remove(ActiveQueue, RemovedIndex)
		ReflowQueue(Entry.SlotIndex)
		local ExitX = if Entry.ExitsLeft then -1.3 else 1.3
		local ExitTween = TweenService:Create(Entry.Label, SLIDE_TWEEN_INFO, {Position = UDim2.new(ExitX, 0, SlotY(Entry.SlotIndex), 0)})
		ExitTween:Play()
		ExitTween.Completed:Wait()
		Entry.Label:Destroy()
	end

	local function ScheduleDespawn(Entry)
		Entry.Generation += 1
		local ScheduledGeneration = Entry.Generation
		task.delay(DISPLAY_SECONDS, function()
			if Entry.Generation == ScheduledGeneration then
				DespawnEntry(Entry)
			end
		end)
	end

	function Notification.Notify(Text, Color, From, Id)
		local ExistingEntry = FindEntryById(Id)
		if ExistingEntry then
			ExistingEntry.Label.Text = BuildDisplayText(Text, From)
			ExistingEntry.Label.TextColor3 = Color or Color3.new(1, 1, 1)
			ScheduleDespawn(ExistingEntry)
			return
		end
		if #ActiveQueue >= MAX_VISIBLE then
			local OldestEntry = ActiveQueue[1]
			OldestEntry.Generation += 1
			task.spawn(DespawnEntry, OldestEntry)
		end
		local NotificationGui = LocalPlayer:WaitForChild("PlayerGui"):WaitForChild("Notification")
		local AnnouncementLabel = script:WaitForChild("AnnouncementTemplate"):Clone()
		local SlotIndex = #ActiveQueue + 1
		AnnouncementLabel.Name = if SlotIndex % 2 == 1 then "Announce1" else "Announce2"
		AnnouncementLabel.Text = BuildDisplayText(Text, From)
		AnnouncementLabel.TextColor3 = Color or Color3.new(1, 1, 1)
		AnnouncementLabel.Position = UDim2.new(SLOT_X, 0, 0, 0)
		AnnouncementLabel.Visible = true
		AnnouncementLabel.Parent = NotificationGui
		local Entry = {Label = AnnouncementLabel, SlotIndex = SlotIndex, ExitsLeft = SlotIndex % 2 == 1, Id = Id, Generation = 0}
		table.insert(ActiveQueue, Entry)
		TweenService:Create(AnnouncementLabel, SLIDE_TWEEN_INFO, {Position = UDim2.new(SLOT_X, 0, SlotY(SlotIndex), 0)}):Play()
		ScheduleDespawn(Entry)
	end

	Remotes.AnnouncementFire.OnClientEvent:Connect(Notification.Notify)
end

return Notification`,
'SquadDataStore.lua':`local DataStoreService = game:GetService("DataStoreService")

local SquadRecordsStore = DataStoreService:GetDataStore("SquadRecords")
local SquadNameIndexStore = DataStoreService:GetDataStore("SquadNameIndex")
local SquadIdCounterStore = DataStoreService:GetDataStore("SquadIdCounter")
local SquadOrderStore = DataStoreService:GetOrderedDataStore("SquadOrder")
local PendingRequestsStore = DataStoreService:GetDataStore("SquadPendingRequests")
local MemberSquadIndexStore = DataStoreService:GetDataStore("SquadMemberIndex")

local MAX_MEMBERS_PER_SQUAD = 200
local OWNER_ROLE_NUMBER = 254
local DEFAULT_MEMBER_ROLE_NUMBER = 1
local MAX_AUDIT_LOG_ENTRIES = 100

local function NormalizeSquadName(SquadName)
	return string.lower(SquadName)
end

local function RunStoreCall(FailureMessage, StoreCall)
	local Success = pcall(StoreCall)
	if not Success then
		warn("[SQUAD SYSTEM] " .. FailureMessage)
	end
	return Success
end

local SquadDataStore = {}
SquadDataStore.MaxMembersPerSquad = MAX_MEMBERS_PER_SQUAD
SquadDataStore.OwnerRoleNumber = OWNER_ROLE_NUMBER
SquadDataStore.DefaultMemberRoleNumber = DEFAULT_MEMBER_ROLE_NUMBER
SquadDataStore.MaxAuditLogEntries = MAX_AUDIT_LOG_ENTRIES
SquadDataStore.NormalizeSquadName = NormalizeSquadName

local function GetNextSquadId()
	local Success, NewCounterValue = pcall(function()
		return SquadIdCounterStore:IncrementAsync("Counter", 1)
	end)
	if not Success then
		warn("[SQUAD SYSTEM] Failed to increment squad id counter")
		return nil
	end
	return NewCounterValue
end

function SquadDataStore.IsNameTaken(SquadName)
	local Success, ExistingSquadId = pcall(function()
		return SquadNameIndexStore:GetAsync(NormalizeSquadName(SquadName))
	end)
	if not Success then
		warn("[SQUAD SYSTEM] Failed to check squad name availability for " .. SquadName)
		return true
	end
	return ExistingSquadId ~= nil
end

function SquadDataStore.RenameSquad(SquadRecord, NewSquadName)
	local OldNormalizedName = NormalizeSquadName(SquadRecord.SquadName)
	local NewNormalizedName = NormalizeSquadName(NewSquadName)
	if OldNormalizedName == NewNormalizedName then
		SquadRecord.SquadName = NewSquadName
		return true
	end
	local LockSuccess, LockResult = pcall(function()
		return SquadNameIndexStore:UpdateAsync(NewNormalizedName, function(ExistingSquadId)
			if ExistingSquadId ~= nil then
				return nil
			end
			return SquadRecord.SquadId
		end)
	end)
	if not LockSuccess or LockResult == nil then
		return false, "NameTaken"
	end
	RunStoreCall("old name didnt get released, nobody can reuse it", function()
		SquadNameIndexStore:RemoveAsync(OldNormalizedName)
	end)
	SquadRecord.SquadName = NewSquadName
	return true
end

function SquadDataStore.CreateSquad(OwnerUserId, OwnerName, SquadName, ImageId, Description, Mode)
	local NormalizedName = NormalizeSquadName(SquadName)
	local LockSuccess, LockResult = pcall(function()
		return SquadNameIndexStore:UpdateAsync(NormalizedName, function(ExistingSquadId)
			if ExistingSquadId ~= nil then
				return nil
			end
			return "PENDING"
		end)
	end)
	if not LockSuccess or LockResult == nil then
		return nil, "NameTaken"
	end
	local NewSquadId = GetNextSquadId()
	if not NewSquadId then
		RunStoreCall("name lock stuck after id alloc failed, clean it by hand", function()
			SquadNameIndexStore:RemoveAsync(NormalizedName)
		end)
		return nil, "IdAllocationFailed"
	end
	local SquadRecord = {
		SquadId = NewSquadId,
		SquadName = SquadName,
		OwnerUserId = OwnerUserId,
		ImageId = ImageId,
		Description = Description,
		Mode = Mode,
		CreatedAt = os.time(),
		Members = {[tostring(OwnerUserId)] = {UserId = OwnerUserId, Username = OwnerName, RoleNumber = OWNER_ROLE_NUMBER}},
		Roles = {
			[tostring(OWNER_ROLE_NUMBER)] = {RoleNumber = OWNER_ROLE_NUMBER, RoleName = "OWNER", Permissions = {ManageRanks = true, KickMembers = true, AcceptJoinRequest = true, DenyJoinRequest = true, ViewAuditLogs = true}},
			[tostring(DEFAULT_MEMBER_ROLE_NUMBER)] = {RoleNumber = DEFAULT_MEMBER_ROLE_NUMBER, RoleName = "MEMBER", Permissions = {}},
		},
		Requests = {},
		AuditLogs = {},
	}
	local SaveSuccess = pcall(function()
		SquadRecordsStore:SetAsync(tostring(NewSquadId), SquadRecord)
	end)
	if not SaveSuccess then
		RunStoreCall("name lock stuck after save failed", function()
			SquadNameIndexStore:RemoveAsync(NormalizedName)
		end)
		return nil, "SaveFailed"
	end
	RunStoreCall("name index write failed, name still says PENDING", function()
		SquadNameIndexStore:SetAsync(NormalizedName, NewSquadId)
	end)
	RunStoreCall("squad saved but missing from order list, wont show in browse", function()
		SquadOrderStore:SetAsync(tostring(NewSquadId), NewSquadId)
	end)
	SquadDataStore.SetMemberSquadId(OwnerUserId, NewSquadId)
	return SquadRecord, nil
end

function SquadDataStore.GetSquad(SquadId)
	local Success, SquadRecord = pcall(function()
		return SquadRecordsStore:GetAsync(tostring(SquadId))
	end)
	if not Success then
		warn("[SQUAD SYSTEM] Failed to load squad " .. tostring(SquadId))
		return nil
	end
	return SquadRecord
end

function SquadDataStore.SaveSquad(SquadRecord)
	local Success = pcall(function()
		SquadRecordsStore:SetAsync(tostring(SquadRecord.SquadId), SquadRecord)
	end)
	if not Success then
		warn("[SQUAD SYSTEM] Failed to save squad " .. tostring(SquadRecord.SquadId))
	end
	return Success
end

function SquadDataStore.DeleteSquad(SquadRecord)
	local RecordRemoveSuccess = pcall(function()
		SquadRecordsStore:RemoveAsync(tostring(SquadRecord.SquadId))
	end)
	if not RecordRemoveSuccess then
		warn("[SQUAD SYSTEM] Failed to remove squad record " .. tostring(SquadRecord.SquadId) .. ", retrying once")
		task.wait(1)
		RunStoreCall("record still there after retry", function()
			SquadRecordsStore:RemoveAsync(tostring(SquadRecord.SquadId))
		end)
	end
	RunStoreCall("name not freed on delete, stays taken", function()
		SquadNameIndexStore:RemoveAsync(NormalizeSquadName(SquadRecord.SquadName))
	end)
	local OrderRemoveSuccess = pcall(function()
		SquadOrderStore:RemoveAsync(tostring(SquadRecord.SquadId))
	end)
	if not OrderRemoveSuccess then
		warn("[SQUAD SYSTEM] Failed to remove squad " .. tostring(SquadRecord.SquadId) .. " from order list, retrying once")
		task.wait(1)
		RunStoreCall("order entry still there after retry, ghost squad in browse", function()
			SquadOrderStore:RemoveAsync(tostring(SquadRecord.SquadId))
		end)
	end
	for MemberUserIdString in pairs(SquadRecord.Members) do
		SquadDataStore.ClearMemberSquadId(tonumber(MemberUserIdString))
	end
end

function SquadDataStore.RemoveFromOrder(SquadId)
	local Success = pcall(function()
		SquadOrderStore:RemoveAsync(tostring(SquadId))
	end)
	if not Success then
		warn("[SQUAD SYSTEM] Failed to purge ghost squad " .. tostring(SquadId) .. " from order list")
	end
end

function SquadDataStore.GetSquadOrderPages(PageSize)
	local Success, Pages = pcall(function()
		return SquadOrderStore:GetSortedAsync(true, PageSize)
	end)
	if not Success then
		warn("[SQUAD SYSTEM] Failed to fetch squad order pages")
		return nil
	end
	return Pages
end

function SquadDataStore.ReadSquadIdsFromPage(Pages)
	local SquadIdList = {}
	for _, Entry in ipairs(Pages:GetCurrentPage()) do
		table.insert(SquadIdList, Entry.value)
	end
	return SquadIdList
end

function SquadDataStore.GetPendingSquadIds(UserId)
	local Success, PendingList = pcall(function()
		return PendingRequestsStore:GetAsync(tostring(UserId))
	end)
	if not Success or not PendingList then
		return {}
	end
	return PendingList
end

function SquadDataStore.AddPendingSquadId(UserId, SquadId)
	RunStoreCall("couldnt add the pending request", function()
		PendingRequestsStore:UpdateAsync(tostring(UserId), function(PendingList)
			PendingList = PendingList or {}
			for _, ExistingSquadId in ipairs(PendingList) do
				if ExistingSquadId == SquadId then
					return PendingList
				end
			end
			table.insert(PendingList, SquadId)
			return PendingList
		end)
	end)
end

function SquadDataStore.ClearPendingSquadIds(UserId)
	RunStoreCall("couldnt clear pending requests", function()
		PendingRequestsStore:RemoveAsync(tostring(UserId))
	end)
end

function SquadDataStore.RemovePendingSquadId(UserId, SquadId)
	RunStoreCall("couldnt drop that pending request", function()
		PendingRequestsStore:UpdateAsync(tostring(UserId), function(PendingList)
			if not PendingList then
				return nil
			end
			local FilteredList = {}
			for _, ExistingSquadId in ipairs(PendingList) do
				if ExistingSquadId ~= SquadId then
					table.insert(FilteredList, ExistingSquadId)
				end
			end
			return FilteredList
		end)
	end)
end

function SquadDataStore.GetMemberSquadId(UserId)
	local Success, SquadId = pcall(function()
		return MemberSquadIndexStore:GetAsync(tostring(UserId))
	end)
	if not Success then
		warn("[SQUAD SYSTEM] Failed to look up squad membership for " .. tostring(UserId))
		return nil
	end
	return SquadId
end

function SquadDataStore.SetMemberSquadId(UserId, SquadId)
	local Success = pcall(function()
		MemberSquadIndexStore:SetAsync(tostring(UserId), SquadId)
	end)
	if not Success then
		warn("[SQUAD SYSTEM] Failed to index squad membership for " .. tostring(UserId))
	end
end

function SquadDataStore.ClearMemberSquadId(UserId)
	local Success = pcall(function()
		MemberSquadIndexStore:RemoveAsync(tostring(UserId))
	end)
	if not Success then
		warn("[SQUAD SYSTEM] Failed to clear squad membership index for " .. tostring(UserId))
	end
end

function SquadDataStore.AddAuditLogEntry(SquadRecord, ActorUserId, ActorUsername, ActorRoleNumber, ActionText)
	local ActorRoleData = SquadRecord.Roles[tostring(ActorRoleNumber)]
	table.insert(SquadRecord.AuditLogs, 1, {
		ActorUserId = ActorUserId,
		ActorUsername = ActorUsername,
		ActorRoleNumber = ActorRoleNumber,
		ActorRoleName = ActorRoleData and ActorRoleData.RoleName or tostring(ActorRoleNumber),
		ActionText = ActionText,
		Timestamp = os.time(),
	})
	while #SquadRecord.AuditLogs > MAX_AUDIT_LOG_ENTRIES do
		table.remove(SquadRecord.AuditLogs)
	end
end

return SquadDataStore`,
'VoteKick.lua':`local Players = game:GetService("Players")

local Config = require("@game/ReplicatedStorage/Shared/Config")
local Remotes = require("@game/ReplicatedStorage/Shared/Remotes")

local VoteKick = {}

local VotesByTarget = {}
local BannedUntilByUserId = {}
local LastRequestAtByUserId = {}

local function CountVotes(VoterSet)
	local VoteCount = 0
	for _ in VoterSet do
		VoteCount += 1
	end
	return VoteCount
end

function VoteKick.IsBanned(UserId)
	local BannedUntil = BannedUntilByUserId[UserId]
	return BannedUntil ~= nil and os.clock() < BannedUntil
end

function VoteKick.BanPlayer(TargetPlayer, BanSeconds, KickMessage)
	BannedUntilByUserId[TargetPlayer.UserId] = os.clock() + BanSeconds
	TargetPlayer:Kick(KickMessage)
end

local function SyncVoteCount(TargetUserId)
	if not Players:GetPlayerByUserId(TargetUserId) then
		return
	end
	local VoterSet = VotesByTarget[TargetUserId] or {}
	Remotes.VoteKickSync:FireAllClients(TargetUserId, CountVotes(VoterSet), #Players:GetPlayers())
end

Remotes.VoteKickRequest.OnServerEvent:Connect(function(VotingPlayer, TargetUserId)
	if typeof(TargetUserId) ~= "number" then
		return
	end
	local TargetPlayer = Players:GetPlayerByUserId(TargetUserId)
	local LastRequestAt = LastRequestAtByUserId[VotingPlayer.UserId]
	if not TargetPlayer or TargetPlayer == VotingPlayer or (LastRequestAt and os.clock() - LastRequestAt < Config.VoteKickRequestCooldownSeconds) then
		return
	end
	LastRequestAtByUserId[VotingPlayer.UserId] = os.clock()
	if #Players:GetPlayers() < Config.VoteKickMinimumPlayers then
		return
	end
	local VoterSet = VotesByTarget[TargetUserId]
	if not VoterSet then
		VoterSet = {}
		VotesByTarget[TargetUserId] = VoterSet
	end
	VoterSet[VotingPlayer.UserId] = if VoterSet[VotingPlayer.UserId] then nil else true
	SyncVoteCount(TargetUserId)
	if CountVotes(VoterSet) / #Players:GetPlayers() > 0.5 then
		VoteKick.BanPlayer(TargetPlayer, Config.VoteKickBanSeconds, "[VOTE KICK] Server voted you out, try again in 5 minutes")
		VotesByTarget[TargetUserId] = nil
	end
end)

Players.PlayerRemoving:Connect(function(RemovedPlayer)
	VotesByTarget[RemovedPlayer.UserId] = nil
	LastRequestAtByUserId[RemovedPlayer.UserId] = nil
	for _, VoterSet in VotesByTarget do
		VoterSet[RemovedPlayer.UserId] = nil
	end
end)

return VoteKick`
}
