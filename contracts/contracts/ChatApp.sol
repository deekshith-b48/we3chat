// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Enhanced Web3-Native Chat Application
 * @dev Advanced chat application with group chats, reputation system, and enhanced privacy
 * @notice Fully decentralized chat with IPFS integration and client-side encryption
 */
contract ChatApp is Ownable, ReentrancyGuard {
    // Enhanced data structures
    struct UserProfile {
        string username;
        string bio;
        string avatarCid; // IPFS CID for avatar
        bytes32 x25519PublicKey;
        uint256 reputation;
        bool isActive;
        uint256 createdAt;
        uint256 lastSeen;
    }

    struct GroupChat {
        string name;
        string description;
        string avatarCid;
        address creator;
        address[] members;
        uint256 createdAt;
        bool isActive;
    }

    struct Message {
        address sender;
        uint256 timestamp;
        string contentCid; // IPFS CID for encrypted content
        string messageType; // "text", "image", "file", "voice"
        uint256 replyTo; // Message ID being replied to
        bool isEdited;
        uint256 editTimestamp;
    }

    struct FriendRequest {
        address from;
        address to;
        uint256 timestamp;
        bool isActive;
    }

    // State variables
    mapping(address => UserProfile) public userProfiles;
    mapping(address => address[]) public friends;
    mapping(address => mapping(address => bool)) public isFriend;
    mapping(address => mapping(address => uint256)) public friendshipTimestamp;
    
    // Friend requests
    mapping(address => FriendRequest[]) public friendRequests;
    mapping(address => mapping(address => bool)) public hasPendingRequest;
    
    // Group chats
    mapping(uint256 => GroupChat) public groupChats;
    mapping(address => uint256[]) public userGroups;
    uint256 public groupCounter;
    
    // Messages storage
    mapping(bytes32 => Message[]) public conversations; // keyed by conversation hash
    mapping(address => mapping(address => bytes32)) public conversationKeys;
    mapping(uint256 => Message[]) public groupMessages;
    
    // Reputation system
    mapping(address => mapping(address => bool)) public hasRated;
    mapping(address => uint256) public totalRatings;
    mapping(address => uint256) public ratingSum;

    // Events
    event UserRegistered(address indexed user, string username, bytes32 publicKey);
    event ProfileUpdated(address indexed user, string bio, string avatarCid);
    event FriendRequestSent(address indexed from, address indexed to);
    event FriendRequestAccepted(address indexed from, address indexed to);
    event FriendAdded(address indexed user, address indexed friend);
    event FriendRemoved(address indexed user, address indexed friend);
    event GroupCreated(uint256 indexed groupId, address indexed creator, string name);
    event GroupJoined(uint256 indexed groupId, address indexed user);
    event GroupLeft(uint256 indexed groupId, address indexed user);
    event MessageSent(
        address indexed sender, 
        address indexed receiver, 
        bytes32 indexed conversationKey,
        string contentCid,
        uint256 timestamp
    );
    event GroupMessageSent(
        uint256 indexed groupId,
        address indexed sender,
        string contentCid,
        uint256 timestamp
    );
    event ReputationUpdated(address indexed user, uint256 newReputation);

    // Modifiers
    modifier onlyRegistered() {
        require(userProfiles[msg.sender].isActive, "User not registered");
        _;
    }

    modifier onlyActiveUser(address user) {
        require(userProfiles[user].isActive, "User not active");
        _;
    }

    modifier onlyGroupMember(uint256 groupId) {
        require(isGroupMember(groupId, msg.sender), "Not a group member");
        _;
    }

    // User management
    function registerUser(
        string calldata username,
        string calldata bio,
        string calldata avatarCid,
        bytes32 publicKey
    ) external {
        require(bytes(userProfiles[msg.sender].username).length == 0, "User already registered");
        require(bytes(username).length > 0, "Username required");
        require(bytes(username).length <= 50, "Username too long");
        require(publicKey != bytes32(0), "Public key required");
        
        userProfiles[msg.sender] = UserProfile({
            username: username,
            bio: bio,
            avatarCid: avatarCid,
            x25519PublicKey: publicKey,
            reputation: 0,
            isActive: true,
            createdAt: block.timestamp,
            lastSeen: block.timestamp
        });
        
        emit UserRegistered(msg.sender, username, publicKey);
    }

    function updateProfile(
        string calldata bio,
        string calldata avatarCid
    ) external onlyRegistered {
        userProfiles[msg.sender].bio = bio;
        userProfiles[msg.sender].avatarCid = avatarCid;
        userProfiles[msg.sender].lastSeen = block.timestamp;
        
        emit ProfileUpdated(msg.sender, bio, avatarCid);
    }

    function updatePublicKey(bytes32 publicKey) external onlyRegistered {
        require(publicKey != bytes32(0), "Public key cannot be empty");
        userProfiles[msg.sender].x25519PublicKey = publicKey;
        userProfiles[msg.sender].lastSeen = block.timestamp;
    }

    // Enhanced friend management with mutual consent
    function sendFriendRequest(address friend) external onlyRegistered onlyActiveUser(friend) {
        require(!isFriend[msg.sender][friend], "Already friends");
        require(msg.sender != friend, "Cannot friend yourself");
        require(!hasPendingRequest[msg.sender][friend], "Request already sent");
        require(!hasPendingRequest[friend][msg.sender], "Friend has pending request to you");
        
        friendRequests[friend].push(FriendRequest({
            from: msg.sender,
            to: friend,
            timestamp: block.timestamp,
            isActive: true
        }));
        
        hasPendingRequest[msg.sender][friend] = true;
        emit FriendRequestSent(msg.sender, friend);
    }

    function acceptFriendRequest(address friend) external onlyRegistered onlyActiveUser(friend) {
        require(!isFriend[msg.sender][friend], "Already friends");
        require(hasPendingRequest[friend][msg.sender], "No pending request");
        
        // Add mutual friendship
        friends[msg.sender].push(friend);
        friends[friend].push(msg.sender);
        isFriend[msg.sender][friend] = true;
        isFriend[friend][msg.sender] = true;
        friendshipTimestamp[msg.sender][friend] = block.timestamp;
        friendshipTimestamp[friend][msg.sender] = block.timestamp;
        
        // Remove pending request
        hasPendingRequest[friend][msg.sender] = false;
        
        emit FriendRequestAccepted(friend, msg.sender);
        emit FriendAdded(msg.sender, friend);
        emit FriendAdded(friend, msg.sender);
    }

    function removeFriend(address friend) external onlyRegistered {
        require(isFriend[msg.sender][friend], "Not friends");
        
        // Remove from friends array
        address[] storage userFriends = friends[msg.sender];
        for (uint i = 0; i < userFriends.length; i++) {
            if (userFriends[i] == friend) {
                userFriends[i] = userFriends[userFriends.length - 1];
                userFriends.pop();
                break;
            }
        }
        
        // Remove mutual friendship
        isFriend[msg.sender][friend] = false;
        isFriend[friend][msg.sender] = false;
        
        emit FriendRemoved(msg.sender, friend);
        emit FriendRemoved(friend, msg.sender);
    }

    // Group chat functionality
    function createGroup(
        string calldata name,
        string calldata description,
        string calldata avatarCid,
        address[] calldata initialMembers
    ) external onlyRegistered returns (uint256) {
        require(bytes(name).length > 0, "Group name required");
        require(bytes(name).length <= 100, "Group name too long");
        
        uint256 groupId = groupCounter++;
        groupChats[groupId] = GroupChat({
            name: name,
            description: description,
            avatarCid: avatarCid,
            creator: msg.sender,
            members: initialMembers,
            createdAt: block.timestamp,
            isActive: true
        });
        
        // Add creator to members
        groupChats[groupId].members.push(msg.sender);
        userGroups[msg.sender].push(groupId);
        
        // Add initial members
        for (uint i = 0; i < initialMembers.length; i++) {
            if (userProfiles[initialMembers[i]].isActive) {
                groupChats[groupId].members.push(initialMembers[i]);
                userGroups[initialMembers[i]].push(groupId);
                emit GroupJoined(groupId, initialMembers[i]);
            }
        }
        
        emit GroupCreated(groupId, msg.sender, name);
        return groupId;
    }

    function joinGroup(uint256 groupId) external onlyRegistered {
        require(groupChats[groupId].isActive, "Group not active");
        require(!isGroupMember(groupId, msg.sender), "Already a member");
        
        groupChats[groupId].members.push(msg.sender);
        userGroups[msg.sender].push(groupId);
        
        emit GroupJoined(groupId, msg.sender);
    }

    function leaveGroup(uint256 groupId) external onlyRegistered onlyGroupMember(groupId) {
        require(groupChats[groupId].creator != msg.sender, "Creator cannot leave group");
        
        // Remove from group members
        address[] storage members = groupChats[groupId].members;
        for (uint i = 0; i < members.length; i++) {
            if (members[i] == msg.sender) {
                members[i] = members[members.length - 1];
                members.pop();
                break;
            }
        }
        
        // Remove from user groups
        uint256[] storage userGroupList = userGroups[msg.sender];
        for (uint i = 0; i < userGroupList.length; i++) {
            if (userGroupList[i] == groupId) {
                userGroupList[i] = userGroupList[userGroupList.length - 1];
                userGroupList.pop();
                break;
            }
        }
        
        emit GroupLeft(groupId, msg.sender);
    }

    // Enhanced messaging with different types
    function sendMessage(
        address receiver,
        string calldata contentCid,
        string calldata messageType
    ) external onlyRegistered onlyActiveUser(receiver) {
        require(isFriend[msg.sender][receiver], "Not friends");
        require(bytes(contentCid).length > 0, "Content CID required");
        
        bytes32 convKey = getConversationKey(msg.sender, receiver);
        if (conversationKeys[msg.sender][receiver] == bytes32(0)) {
            conversationKeys[msg.sender][receiver] = convKey;
            conversationKeys[receiver][msg.sender] = convKey;
        }

        Message memory newMessage = Message({
            sender: msg.sender,
            timestamp: block.timestamp,
            contentCid: contentCid,
            messageType: messageType,
            replyTo: 0,
            isEdited: false,
            editTimestamp: 0
        });
        
        conversations[convKey].push(newMessage);
        userProfiles[msg.sender].lastSeen = block.timestamp;
        
        emit MessageSent(msg.sender, receiver, convKey, contentCid, block.timestamp);
    }

    function sendGroupMessage(
        uint256 groupId,
        string calldata contentCid,
        string calldata messageType
    ) external onlyRegistered onlyGroupMember(groupId) {
        require(groupChats[groupId].isActive, "Group not active");
        require(bytes(contentCid).length > 0, "Content CID required");
        
        Message memory newMessage = Message({
            sender: msg.sender,
            timestamp: block.timestamp,
            contentCid: contentCid,
            messageType: messageType,
            replyTo: 0,
            isEdited: false,
            editTimestamp: 0
        });
        
        groupMessages[groupId].push(newMessage);
        userProfiles[msg.sender].lastSeen = block.timestamp;
        
        emit GroupMessageSent(groupId, msg.sender, contentCid, block.timestamp);
    }

    // Reputation system
    function rateUser(address user, uint256 rating) external onlyRegistered onlyActiveUser(user) {
        require(rating >= 1 && rating <= 5, "Rating must be between 1 and 5");
        require(!hasRated[msg.sender][user], "Already rated this user");
        require(msg.sender != user, "Cannot rate yourself");
        
        hasRated[msg.sender][user] = true;
        totalRatings[user]++;
        ratingSum[user] += rating;
        
        // Update reputation (average rating)
        userProfiles[user].reputation = ratingSum[user] / totalRatings[user];
        
        emit ReputationUpdated(user, userProfiles[user].reputation);
    }

    // View functions
    function getConversation(address user1, address user2) 
        external view returns (Message[] memory) {
        bytes32 convKey = getConversationKey(user1, user2);
        return conversations[convKey];
    }

    function getGroupMessages(uint256 groupId) 
        external view returns (Message[] memory) {
        return groupMessages[groupId];
    }

    function getUserGroups(address user) external view returns (uint256[] memory) {
        return userGroups[user];
    }

    function getGroupInfo(uint256 groupId) external view returns (GroupChat memory) {
        return groupChats[groupId];
    }

    function getFriendRequests(address user) external view returns (FriendRequest[] memory) {
        return friendRequests[user];
    }

    function isGroupMember(uint256 groupId, address user) public view returns (bool) {
        address[] memory members = groupChats[groupId].members;
        for (uint i = 0; i < members.length; i++) {
            if (members[i] == user) return true;
        }
        return false;
    }

    function getConversationKey(address user1, address user2) public pure returns (bytes32) {
        return user1 < user2 
            ? keccak256(abi.encodePacked(user1, user2))
            : keccak256(abi.encodePacked(user2, user1));
    }

    function getUserProfile(address user) external view returns (UserProfile memory) {
        return userProfiles[user];
    }

    function getFriends(address user) external view returns (address[] memory) {
        return friends[user];
    }

    // Admin functions
    function deactivateUser(address user) external onlyOwner {
        userProfiles[user].isActive = false;
    }

    function activateUser(address user) external onlyOwner {
        userProfiles[user].isActive = true;
    }

    function deactivateGroup(uint256 groupId) external onlyOwner {
        groupChats[groupId].isActive = false;
    }
}
