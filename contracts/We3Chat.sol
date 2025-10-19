// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title We3Chat
 * @dev A comprehensive decentralized chat application smart contract
 * @author We3Chat Team
 */
contract We3Chat is ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;

    // Events
    event UserRegistered(
        address indexed user,
        string username,
        string displayName,
        string avatar,
        bytes32 publicKey,
        uint256 timestamp
    );
    
    event ProfileUpdated(
        address indexed user,
        string username,
        string displayName,
        string avatar,
        uint256 timestamp
    );
    
    event FriendRequestSent(
        address indexed from,
        address indexed to,
        uint256 timestamp
    );
    
    event FriendRequestAccepted(
        address indexed from,
        address indexed to,
        uint256 timestamp
    );
    
    event FriendRemoved(
        address indexed from,
        address indexed to,
        uint256 timestamp
    );
    
    event MessageSent(
        address indexed from,
        address indexed to,
        bytes32 indexed messageId,
        string messageType,
        bytes32 contentHash,
        uint256 timestamp,
        bool isEncrypted
    );
    
    event GroupCreated(
        bytes32 indexed groupId,
        address indexed creator,
        string name,
        string description,
        uint256 timestamp
    );
    
    event GroupMemberAdded(
        bytes32 indexed groupId,
        address indexed member,
        address indexed addedBy,
        uint256 timestamp
    );
    
    event GroupMemberRemoved(
        bytes32 indexed groupId,
        address indexed member,
        address indexed removedBy,
        uint256 timestamp
    );
    
    event GroupMessageSent(
        bytes32 indexed groupId,
        address indexed from,
        bytes32 indexed messageId,
        string messageType,
        bytes32 contentHash,
        uint256 timestamp,
        bool isEncrypted
    );
    
    event FileShared(
        address indexed from,
        address indexed to,
        bytes32 indexed fileId,
        string fileName,
        uint256 fileSize,
        string fileType,
        bytes32 ipfsHash,
        uint256 timestamp
    );
    
    event NFTShared(
        address indexed from,
        address indexed to,
        address indexed nftContract,
        uint256 tokenId,
        bytes32 messageId,
        uint256 timestamp
    );
    
    event TokenTransferred(
        address indexed from,
        address indexed to,
        address indexed tokenContract,
        uint256 amount,
        bytes32 messageId,
        uint256 timestamp
    );

    // Structs
    struct User {
        string username;
        string displayName;
        string avatar;
        bytes32 publicKey;
        bool isRegistered;
        uint256 registrationTime;
        uint256 lastSeen;
        bool isOnline;
    }
    
    struct Friend {
        address friendAddress;
        string username;
        string displayName;
        string avatar;
        uint256 addedAt;
        bool isBlocked;
    }
    
    struct Message {
        address sender;
        address receiver;
        bytes32 messageId;
        string messageType; // text, image, file, nft, token, voice, video
        bytes32 contentHash;
        uint256 timestamp;
        bool isEncrypted;
        bool isRead;
        bytes32 replyTo;
    }
    
    struct Group {
        bytes32 groupId;
        string name;
        string description;
        address creator;
        address[] members;
        mapping(address => bool) isMember;
        mapping(address => bool) isAdmin;
        uint256 createdAt;
        bool isActive;
    }
    
    struct GroupMessage {
        bytes32 groupId;
        address sender;
        bytes32 messageId;
        string messageType;
        bytes32 contentHash;
        uint256 timestamp;
        bool isEncrypted;
        bytes32 replyTo;
    }
    
    struct FileShare {
        bytes32 fileId;
        string fileName;
        uint256 fileSize;
        string fileType;
        bytes32 ipfsHash;
        address uploader;
        uint256 timestamp;
    }

    // State variables
    mapping(address => User) public users;
    mapping(address => mapping(address => Friend)) public friends;
    mapping(address => address[]) public friendLists;
    mapping(address => address[]) public friendRequests;
    mapping(address => mapping(address => bool)) public friendRequestSent;
    
    mapping(bytes32 => Message) public messages;
    mapping(address => bytes32[]) public userMessages;
    mapping(address => mapping(address => bytes32[])) public conversationMessages;
    
    mapping(bytes32 => Group) public groups;
    mapping(bytes32 => GroupMessage) public groupMessages;
    mapping(bytes32 => bytes32[]) public groupMessageLists;
    
    mapping(bytes32 => FileShare) public fileShares;
    mapping(address => bytes32[]) public userFiles;
    
    Counters.Counter private _messageCounter;
    Counters.Counter private _groupCounter;
    Counters.Counter private _fileCounter;
    
    // Modifiers
    modifier onlyRegistered() {
        require(users[msg.sender].isRegistered, "User not registered");
        _;
    }
    
    modifier onlyGroupMember(bytes32 groupId) {
        require(groups[groupId].isMember[msg.sender], "Not a group member");
        _;
    }
    
    modifier onlyGroupAdmin(bytes32 groupId) {
        require(groups[groupId].isAdmin[msg.sender], "Not a group admin");
        _;
    }

    // User registration and profile management
    function registerUser(
        string memory _username,
        string memory _displayName,
        string memory _avatar,
        bytes32 _publicKey
    ) external {
        require(!users[msg.sender].isRegistered, "User already registered");
        require(bytes(_username).length > 0, "Username cannot be empty");
        require(bytes(_displayName).length > 0, "Display name cannot be empty");
        
        users[msg.sender] = User({
            username: _username,
            displayName: _displayName,
            avatar: _avatar,
            publicKey: _publicKey,
            isRegistered: true,
            registrationTime: block.timestamp,
            lastSeen: block.timestamp,
            isOnline: true
        });
        
        emit UserRegistered(msg.sender, _username, _displayName, _avatar, _publicKey, block.timestamp);
    }
    
    function updateProfile(
        string memory _username,
        string memory _displayName,
        string memory _avatar
    ) external onlyRegistered {
        require(bytes(_username).length > 0, "Username cannot be empty");
        require(bytes(_displayName).length > 0, "Display name cannot be empty");
        
        users[msg.sender].username = _username;
        users[msg.sender].displayName = _displayName;
        users[msg.sender].avatar = _avatar;
        
        emit ProfileUpdated(msg.sender, _username, _displayName, _avatar, block.timestamp);
    }
    
    function updatePublicKey(bytes32 _publicKey) external onlyRegistered {
        users[msg.sender].publicKey = _publicKey;
    }
    
    function updateLastSeen() external onlyRegistered {
        users[msg.sender].lastSeen = block.timestamp;
        users[msg.sender].isOnline = true;
    }
    
    function setOffline() external onlyRegistered {
        users[msg.sender].isOnline = false;
    }

    // Friend management
    function sendFriendRequest(address _friend) external onlyRegistered {
        require(_friend != msg.sender, "Cannot add yourself");
        require(users[_friend].isRegistered, "User not registered");
        require(!friendRequestSent[msg.sender][_friend], "Friend request already sent");
        require(!friends[msg.sender][_friend].friendAddress != address(0), "Already friends");
        
        friendRequestSent[msg.sender][_friend] = true;
        friendRequests[_friend].push(msg.sender);
        
        emit FriendRequestSent(msg.sender, _friend, block.timestamp);
    }
    
    function acceptFriendRequest(address _friend) external onlyRegistered {
        require(friendRequestSent[_friend][msg.sender], "No friend request from this user");
        
        // Add to both friend lists
        friends[msg.sender][_friend] = Friend({
            friendAddress: _friend,
            username: users[_friend].username,
            displayName: users[_friend].displayName,
            avatar: users[_friend].avatar,
            addedAt: block.timestamp,
            isBlocked: false
        });
        
        friends[_friend][msg.sender] = Friend({
            friendAddress: msg.sender,
            username: users[msg.sender].username,
            displayName: users[msg.sender].displayName,
            avatar: users[msg.sender].avatar,
            addedAt: block.timestamp,
            isBlocked: false
        });
        
        friendLists[msg.sender].push(_friend);
        friendLists[_friend].push(msg.sender);
        
        // Remove from friend requests
        _removeFriendRequest(_friend, msg.sender);
        
        emit FriendRequestAccepted(msg.sender, _friend, block.timestamp);
    }
    
    function removeFriend(address _friend) external onlyRegistered {
        require(friends[msg.sender][_friend].friendAddress != address(0), "Not friends");
        
        // Remove from friend lists
        _removeFromFriendList(msg.sender, _friend);
        _removeFromFriendList(_friend, msg.sender);
        
        // Clear friend data
        delete friends[msg.sender][_friend];
        delete friends[_friend][msg.sender];
        
        emit FriendRemoved(msg.sender, _friend, block.timestamp);
    }
    
    function blockFriend(address _friend) external onlyRegistered {
        require(friends[msg.sender][_friend].friendAddress != address(0), "Not friends");
        friends[msg.sender][_friend].isBlocked = true;
    }
    
    function unblockFriend(address _friend) external onlyRegistered {
        require(friends[msg.sender][_friend].friendAddress != address(0), "Not friends");
        friends[msg.sender][_friend].isBlocked = false;
    }

    // Direct messaging
    function sendMessage(
        address _to,
        string memory _messageType,
        bytes32 _contentHash,
        bool _isEncrypted,
        bytes32 _replyTo
    ) external onlyRegistered nonReentrant {
        require(users[_to].isRegistered, "Recipient not registered");
        require(friends[msg.sender][_to].friendAddress != address(0), "Not friends");
        require(!friends[msg.sender][_to].isBlocked, "Friend is blocked");
        
        _messageCounter.increment();
        bytes32 messageId = keccak256(abi.encodePacked(msg.sender, _to, _messageCounter.current(), block.timestamp));
        
        messages[messageId] = Message({
            sender: msg.sender,
            receiver: _to,
            messageId: messageId,
            messageType: _messageType,
            contentHash: _contentHash,
            timestamp: block.timestamp,
            isEncrypted: _isEncrypted,
            isRead: false,
            replyTo: _replyTo
        });
        
        userMessages[msg.sender].push(messageId);
        userMessages[_to].push(messageId);
        conversationMessages[msg.sender][_to].push(messageId);
        conversationMessages[_to][msg.sender].push(messageId);
        
        emit MessageSent(msg.sender, _to, messageId, _messageType, _contentHash, block.timestamp, _isEncrypted);
    }
    
    function markMessageAsRead(bytes32 _messageId) external onlyRegistered {
        require(messages[_messageId].receiver == msg.sender, "Not your message");
        messages[_messageId].isRead = true;
    }

    // Group management
    function createGroup(
        string memory _name,
        string memory _description,
        address[] memory _initialMembers
    ) external onlyRegistered returns (bytes32) {
        require(bytes(_name).length > 0, "Group name cannot be empty");
        require(_initialMembers.length <= 50, "Too many initial members");
        
        _groupCounter.increment();
        bytes32 groupId = keccak256(abi.encodePacked(msg.sender, _groupCounter.current(), block.timestamp));
        
        Group storage group = groups[groupId];
        group.groupId = groupId;
        group.name = _name;
        group.description = _description;
        group.creator = msg.sender;
        group.createdAt = block.timestamp;
        group.isActive = true;
        
        // Add creator as admin and member
        group.members.push(msg.sender);
        group.isMember[msg.sender] = true;
        group.isAdmin[msg.sender] = true;
        
        // Add initial members
        for (uint256 i = 0; i < _initialMembers.length; i++) {
            if (users[_initialMembers[i]].isRegistered && !group.isMember[_initialMembers[i]]) {
                group.members.push(_initialMembers[i]);
                group.isMember[_initialMembers[i]] = true;
            }
        }
        
        emit GroupCreated(groupId, msg.sender, _name, _description, block.timestamp);
        
        return groupId;
    }
    
    function addGroupMember(bytes32 _groupId, address _member) external onlyGroupAdmin(_groupId) {
        require(users[_member].isRegistered, "User not registered");
        require(!groups[_groupId].isMember[_member], "Already a member");
        
        groups[_groupId].members.push(_member);
        groups[_groupId].isMember[_member] = true;
        
        emit GroupMemberAdded(_groupId, _member, msg.sender, block.timestamp);
    }
    
    function removeGroupMember(bytes32 _groupId, address _member) external onlyGroupAdmin(_groupId) {
        require(groups[_groupId].isMember[_member], "Not a member");
        require(_member != groups[_groupId].creator, "Cannot remove creator");
        
        groups[_groupId].isMember[_member] = false;
        _removeFromGroupMembers(_groupId, _member);
        
        emit GroupMemberRemoved(_groupId, _member, msg.sender, block.timestamp);
    }
    
    function sendGroupMessage(
        bytes32 _groupId,
        string memory _messageType,
        bytes32 _contentHash,
        bool _isEncrypted,
        bytes32 _replyTo
    ) external onlyGroupMember(_groupId) {
        require(groups[_groupId].isActive, "Group not active");
        
        _messageCounter.increment();
        bytes32 messageId = keccak256(abi.encodePacked(msg.sender, _groupId, _messageCounter.current(), block.timestamp));
        
        groupMessages[messageId] = GroupMessage({
            groupId: _groupId,
            sender: msg.sender,
            messageId: messageId,
            messageType: _messageType,
            contentHash: _contentHash,
            timestamp: block.timestamp,
            isEncrypted: _isEncrypted,
            replyTo: _replyTo
        });
        
        groupMessageLists[_groupId].push(messageId);
        
        emit GroupMessageSent(_groupId, msg.sender, messageId, _messageType, _contentHash, block.timestamp, _isEncrypted);
    }

    // File sharing
    function shareFile(
        address _to,
        string memory _fileName,
        uint256 _fileSize,
        string memory _fileType,
        bytes32 _ipfsHash
    ) external onlyRegistered nonReentrant {
        require(users[_to].isRegistered, "Recipient not registered");
        require(friends[msg.sender][_to].friendAddress != address(0), "Not friends");
        
        _fileCounter.increment();
        bytes32 fileId = keccak256(abi.encodePacked(msg.sender, _to, _fileCounter.current(), block.timestamp));
        
        fileShares[fileId] = FileShare({
            fileId: fileId,
            fileName: _fileName,
            fileSize: _fileSize,
            fileType: _fileType,
            ipfsHash: _ipfsHash,
            uploader: msg.sender,
            timestamp: block.timestamp
        });
        
        userFiles[msg.sender].push(fileId);
        userFiles[_to].push(fileId);
        
        emit FileShared(msg.sender, _to, fileId, _fileName, _fileSize, _fileType, _ipfsHash, block.timestamp);
    }

    // View functions
    function getUser(address _user) external view returns (User memory) {
        return users[_user];
    }
    
    function getFriends(address _user) external view returns (Friend[] memory) {
        address[] memory friendAddresses = friendLists[_user];
        Friend[] memory friendList = new Friend[](friendAddresses.length);
        
        for (uint256 i = 0; i < friendAddresses.length; i++) {
            friendList[i] = friends[_user][friendAddresses[i]];
        }
        
        return friendList;
    }
    
    function getFriendRequests(address _user) external view returns (address[] memory) {
        return friendRequests[_user];
    }
    
    function getMessages(address _user1, address _user2) external view returns (bytes32[] memory) {
        return conversationMessages[_user1][_user2];
    }
    
    function getMessage(bytes32 _messageId) external view returns (Message memory) {
        return messages[_messageId];
    }
    
    function getGroup(bytes32 _groupId) external view returns (
        bytes32 groupId,
        string memory name,
        string memory description,
        address creator,
        address[] memory members,
        uint256 createdAt,
        bool isActive
    ) {
        Group storage group = groups[_groupId];
        return (
            group.groupId,
            group.name,
            group.description,
            group.creator,
            group.members,
            group.createdAt,
            group.isActive
        );
    }
    
    function getGroupMessages(bytes32 _groupId) external view returns (bytes32[] memory) {
        return groupMessageLists[_groupId];
    }
    
    function getGroupMessage(bytes32 _messageId) external view returns (GroupMessage memory) {
        return groupMessages[_messageId];
    }
    
    function getFileShare(bytes32 _fileId) external view returns (FileShare memory) {
        return fileShares[_fileId];
    }
    
    function getUserFiles(address _user) external view returns (bytes32[] memory) {
        return userFiles[_user];
    }
    
    function isFriends(address _user1, address _user2) external view returns (bool) {
        return friends[_user1][_user2].friendAddress != address(0);
    }
    
    function isGroupMember(bytes32 _groupId, address _user) external view returns (bool) {
        return groups[_groupId].isMember[_user];
    }
    
    function isGroupAdmin(bytes32 _groupId, address _user) external view returns (bool) {
        return groups[_groupId].isAdmin[_user];
    }

    // Internal functions
    function _removeFriendRequest(address _from, address _to) internal {
        address[] storage requests = friendRequests[_to];
        for (uint256 i = 0; i < requests.length; i++) {
            if (requests[i] == _from) {
                requests[i] = requests[requests.length - 1];
                requests.pop();
                break;
            }
        }
        friendRequestSent[_from][_to] = false;
    }
    
    function _removeFromFriendList(address _user, address _friend) internal {
        address[] storage friendList = friendLists[_user];
        for (uint256 i = 0; i < friendList.length; i++) {
            if (friendList[i] == _friend) {
                friendList[i] = friendList[friendList.length - 1];
                friendList.pop();
                break;
            }
        }
    }
    
    function _removeFromGroupMembers(bytes32 _groupId, address _member) internal {
        address[] storage members = groups[_groupId].members;
        for (uint256 i = 0; i < members.length; i++) {
            if (members[i] == _member) {
                members[i] = members[members.length - 1];
                members.pop();
                break;
            }
        }
    }
}
