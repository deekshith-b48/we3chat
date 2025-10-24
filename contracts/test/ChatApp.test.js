const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ChatApp", function () {
  let chatApp;
  let owner;
  let user1;
  let user2;
  let user3;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    const ChatApp = await ethers.getContractFactory("ChatApp");
    chatApp = await ChatApp.deploy();
    await chatApp.waitForDeployment();
  });

  describe("User Registration", function () {
    it("Should allow user registration", async function () {
      const username = "alice";
      const bio = "Web3 enthusiast";
      const avatarCid = "QmTest123";
      const publicKey = ethers.keccak256(ethers.toUtf8Bytes("test-public-key"));

      await chatApp.connect(user1).registerUser(username, bio, avatarCid, publicKey);

      const profile = await chatApp.getUserProfile(user1.address);
      expect(profile.username).to.equal(username);
      expect(profile.bio).to.equal(bio);
      expect(profile.avatarCid).to.equal(avatarCid);
      expect(profile.x25519PublicKey).to.equal(publicKey);
      expect(profile.isActive).to.be.true;
    });

    it("Should prevent duplicate registration", async function () {
      const username = "alice";
      const bio = "Web3 enthusiast";
      const avatarCid = "QmTest123";
      const publicKey = ethers.keccak256(ethers.toUtf8Bytes("test-public-key"));

      await chatApp.connect(user1).registerUser(username, bio, avatarCid, publicKey);

      await expect(
        chatApp.connect(user1).registerUser(username, bio, avatarCid, publicKey)
      ).to.be.revertedWith("User already registered");
    });

    it("Should require non-empty username", async function () {
      const bio = "Web3 enthusiast";
      const avatarCid = "QmTest123";
      const publicKey = ethers.keccak256(ethers.toUtf8Bytes("test-public-key"));

      await expect(
        chatApp.connect(user1).registerUser("", bio, avatarCid, publicKey)
      ).to.be.revertedWith("Username required");
    });
  });

  describe("Friend Management", function () {
    beforeEach(async function () {
      // Register users
      const publicKey1 = ethers.keccak256(ethers.toUtf8Bytes("user1-key"));
      const publicKey2 = ethers.keccak256(ethers.toUtf8Bytes("user2-key"));
      const publicKey3 = ethers.keccak256(ethers.toUtf8Bytes("user3-key"));

      await chatApp.connect(user1).registerUser("alice", "Alice bio", "", publicKey1);
      await chatApp.connect(user2).registerUser("bob", "Bob bio", "", publicKey2);
      await chatApp.connect(user3).registerUser("charlie", "Charlie bio", "", publicKey3);
    });

    it("Should allow sending friend requests", async function () {
      await chatApp.connect(user1).sendFriendRequest(user2.address);

      const requests = await chatApp.getFriendRequests(user2.address);
      expect(requests.length).to.equal(1);
      expect(requests[0].from).to.equal(user1.address);
      expect(requests[0].to).to.equal(user2.address);
      expect(requests[0].isActive).to.be.true;
    });

    it("Should allow accepting friend requests", async function () {
      await chatApp.connect(user1).sendFriendRequest(user2.address);
      await chatApp.connect(user2).acceptFriendRequest(user1.address);

      const friends1 = await chatApp.getFriends(user1.address);
      const friends2 = await chatApp.getFriends(user2.address);

      expect(friends1).to.include(user2.address);
      expect(friends2).to.include(user1.address);
    });

    it("Should prevent self-friending", async function () {
      await expect(
        chatApp.connect(user1).sendFriendRequest(user1.address)
      ).to.be.revertedWith("Cannot friend yourself");
    });
  });

  describe("Group Management", function () {
    beforeEach(async function () {
      // Register users
      const publicKey1 = ethers.keccak256(ethers.toUtf8Bytes("user1-key"));
      const publicKey2 = ethers.keccak256(ethers.toUtf8Bytes("user2-key"));
      const publicKey3 = ethers.keccak256(ethers.toUtf8Bytes("user3-key"));

      await chatApp.connect(user1).registerUser("alice", "Alice bio", "", publicKey1);
      await chatApp.connect(user2).registerUser("bob", "Bob bio", "", publicKey2);
      await chatApp.connect(user3).registerUser("charlie", "Charlie bio", "", publicKey3);
    });

    it("Should allow creating groups", async function () {
      const groupName = "Test Group";
      const description = "A test group";
      const avatarCid = "QmGroup123";
      const initialMembers = [user2.address, user3.address];

      const tx = await chatApp.connect(user1).createGroup(groupName, description, avatarCid, initialMembers);
      const receipt = await tx.wait();

      // Check group creation event
      const event = receipt.logs.find(log => {
        try {
          const parsed = chatApp.interface.parseLog(log);
          return parsed.name === "GroupCreated";
        } catch (e) {
          return false;
        }
      });

      expect(event).to.not.be.undefined;
    });

    it("Should allow joining groups", async function () {
      const groupName = "Test Group";
      const description = "A test group";
      const avatarCid = "QmGroup123";
      const initialMembers = [user2.address];

      await chatApp.connect(user1).createGroup(groupName, description, avatarCid, initialMembers);
      await chatApp.connect(user3).joinGroup(0);

      const groupInfo = await chatApp.getGroupInfo(0);
      expect(groupInfo.members).to.include(user3.address);
    });
  });

  describe("Messaging", function () {
    beforeEach(async function () {
      // Register users and make them friends
      const publicKey1 = ethers.keccak256(ethers.toUtf8Bytes("user1-key"));
      const publicKey2 = ethers.keccak256(ethers.toUtf8Bytes("user2-key"));

      await chatApp.connect(user1).registerUser("alice", "Alice bio", "", publicKey1);
      await chatApp.connect(user2).registerUser("bob", "Bob bio", "", publicKey2);

      await chatApp.connect(user1).sendFriendRequest(user2.address);
      await chatApp.connect(user2).acceptFriendRequest(user1.address);
    });

    it("Should allow sending messages between friends", async function () {
      const contentCid = "QmMessage123";
      const messageType = "text";

      await chatApp.connect(user1).sendMessage(user2.address, contentCid, messageType);

      const conversation = await chatApp.getConversation(user1.address, user2.address);
      expect(conversation.length).to.equal(1);
      expect(conversation[0].sender).to.equal(user1.address);
      expect(conversation[0].contentCid).to.equal(contentCid);
      expect(conversation[0].messageType).to.equal(messageType);
    });

    it("Should prevent messaging non-friends", async function () {
      const publicKey3 = ethers.keccak256(ethers.toUtf8Bytes("user3-key"));
      await chatApp.connect(user3).registerUser("charlie", "Charlie bio", "", publicKey3);

      const contentCid = "QmMessage123";
      const messageType = "text";

      await expect(
        chatApp.connect(user1).sendMessage(user3.address, contentCid, messageType)
      ).to.be.revertedWith("Not friends");
    });
  });

  describe("Reputation System", function () {
    beforeEach(async function () {
      // Register users
      const publicKey1 = ethers.keccak256(ethers.toUtf8Bytes("user1-key"));
      const publicKey2 = ethers.keccak256(ethers.toUtf8Bytes("user2-key"));

      await chatApp.connect(user1).registerUser("alice", "Alice bio", "", publicKey1);
      await chatApp.connect(user2).registerUser("bob", "Bob bio", "", publicKey2);
    });

    it("Should allow rating users", async function () {
      const rating = 5;
      await chatApp.connect(user1).rateUser(user2.address, rating);

      const profile = await chatApp.getUserProfile(user2.address);
      expect(profile.reputation).to.equal(rating);
    });

    it("Should prevent self-rating", async function () {
      await expect(
        chatApp.connect(user1).rateUser(user1.address, 5)
      ).to.be.revertedWith("Cannot rate yourself");
    });

    it("Should prevent invalid ratings", async function () {
      await expect(
        chatApp.connect(user1).rateUser(user2.address, 6)
      ).to.be.revertedWith("Rating must be between 1 and 5");
    });
  });

  describe("Admin Functions", function () {
    beforeEach(async function () {
      const publicKey1 = ethers.keccak256(ethers.toUtf8Bytes("user1-key"));
      await chatApp.connect(user1).registerUser("alice", "Alice bio", "", publicKey1);
    });

    it("Should allow owner to deactivate users", async function () {
      await chatApp.deactivateUser(user1.address);

      const profile = await chatApp.getUserProfile(user1.address);
      expect(profile.isActive).to.be.false;
    });

    it("Should prevent non-owner from deactivating users", async function () {
      await expect(
        chatApp.connect(user1).deactivateUser(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
