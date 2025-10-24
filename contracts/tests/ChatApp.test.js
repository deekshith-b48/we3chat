const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ChatApp", function () {
  let chatApp;
  let owner, user1, user2, user3;
  let ownerAddress, user1Address, user2Address, user3Address;

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, user3] = await ethers.getSigners();
    ownerAddress = await owner.getAddress();
    user1Address = await user1.getAddress();
    user2Address = await user2.getAddress();
    user3Address = await user3.getAddress();

    // Deploy contract
    const ChatApp = await ethers.getContractFactory("ChatApp");
    chatApp = await ChatApp.deploy();
    await chatApp.waitForDeployment();
  });

  describe("Account Management", function () {
    it("Should create an account successfully", async function () {
      const username = "testuser";
      await expect(chatApp.connect(user1).createAccount(username))
        .to.emit(chatApp, "AccountCreated")
        .withArgs(user1Address, username);

      expect(await chatApp.usernames(user1Address)).to.equal(username);
      expect(await chatApp.addresses(username)).to.equal(user1Address);
    });

    it("Should not allow creating account with empty username", async function () {
      await expect(chatApp.connect(user1).createAccount(""))
        .to.be.revertedWith("Username cannot be empty");
    });

    it("Should not allow creating account with existing username", async function () {
      const username = "testuser";
      await chatApp.connect(user1).createAccount(username);

      await expect(chatApp.connect(user2).createAccount(username))
        .to.be.revertedWith("Username already taken");
    });

    it("Should not allow creating account twice", async function () {
      const username = "testuser";
      await chatApp.connect(user1).createAccount(username);

      await expect(chatApp.connect(user1).createAccount("newuser"))
        .to.be.revertedWith("Account already exists");
    });

    it("Should check if account exists", async function () {
      expect(await chatApp.accountExists(user1Address)).to.equal(false);

      await chatApp.connect(user1).createAccount("testuser");

      expect(await chatApp.accountExists(user1Address)).to.equal(true);
    });
  });

  describe("Friend Management", function () {
    beforeEach(async function () {
      // Create accounts for users
      await chatApp.connect(user1).createAccount("user1");
      await chatApp.connect(user2).createAccount("user2");
      await chatApp.connect(user3).createAccount("user3");
    });

    it("Should add friend successfully", async function () {
      await expect(chatApp.connect(user1).addFriend(user2Address))
        .to.emit(chatApp, "FriendAdded")
        .withArgs(user1Address, user2Address);

      expect(await chatApp.areFriends(user1Address, user2Address)).to.equal(true);
      expect(await chatApp.areFriends(user2Address, user1Address)).to.equal(true);
    });

    it("Should not add friend if sender has no account", async function () {
      await expect(chatApp.connect(owner).addFriend(user1Address))
        .to.be.revertedWith("Sender account does not exist");
    });

    it("Should not add friend if friend has no account", async function () {
      await expect(chatApp.connect(user1).addFriend(ownerAddress))
        .to.be.revertedWith("Friend account does not exist");
    });

    it("Should not add self as friend", async function () {
      await expect(chatApp.connect(user1).addFriend(user1Address))
        .to.be.revertedWith("Cannot add yourself as friend");
    });

    it("Should not add friend twice", async function () {
      await chatApp.connect(user1).addFriend(user2Address);

      await expect(chatApp.connect(user1).addFriend(user2Address))
        .to.be.revertedWith("Already friends");
    });

    it("Should remove friend successfully", async function () {
      await chatApp.connect(user1).addFriend(user2Address);

      await expect(chatApp.connect(user1).removeFriend(user2Address))
        .to.emit(chatApp, "FriendRemoved")
        .withArgs(user1Address, user2Address);

      expect(await chatApp.areFriends(user1Address, user2Address)).to.equal(false);
    });

    it("Should not remove friend if not friends", async function () {
      await expect(chatApp.connect(user1).removeFriend(user2Address))
        .to.be.revertedWith("Not friends");
    });

    it("Should get friends list", async function () {
      await chatApp.connect(user1).addFriend(user2Address);
      await chatApp.connect(user1).addFriend(user3Address);

      const friends = await chatApp.getFriends(user1Address);
      expect(friends.length).to.equal(2);
      expect(friends).to.include(user2Address);
      expect(friends).to.include(user3Address);
    });
  });

  describe("Messaging", function () {
    beforeEach(async function () {
      // Create accounts and add friends
      await chatApp.connect(user1).createAccount("user1");
      await chatApp.connect(user2).createAccount("user2");
      await chatApp.connect(user1).addFriend(user2Address);
    });

    it("Should send message successfully", async function () {
      const message = "Hello, this is a test message!";
      const ipfsHash = "QmTest123";

      await expect(chatApp.connect(user1).sendMessage(user2Address, message, ipfsHash))
        .to.emit(chatApp, "MessageSent")
        .withArgs(user1Address, user2Address, message, ipfsHash);

      const messages = await chatApp.getMessages(user1Address, user2Address);
      expect(messages.length).to.equal(1);
      expect(messages[0].sender).to.equal(user1Address);
      expect(messages[0].receiver).to.equal(user2Address);
      expect(messages[0].content).to.equal(message);
      expect(messages[0].ipfsHash).to.equal(ipfsHash);
    });

    it("Should not send message if sender has no account", async function () {
      await expect(chatApp.connect(owner).sendMessage(user1Address, "test", "hash"))
        .to.be.revertedWith("Sender account does not exist");
    });

    it("Should not send message if receiver has no account", async function () {
      await expect(chatApp.connect(user1).sendMessage(ownerAddress, "test", "hash"))
        .to.be.revertedWith("Receiver account does not exist");
    });

    it("Should not send message if not friends", async function () {
      await chatApp.connect(user3).createAccount("user3");

      await expect(chatApp.connect(user1).sendMessage(user3Address, "test", "hash"))
        .to.be.revertedWith("Not friends");
    });

    it("Should not send empty message", async function () {
      await expect(chatApp.connect(user1).sendMessage(user2Address, "", "hash"))
        .to.be.revertedWith("Message cannot be empty");
    });

    it("Should get conversation between friends", async function () {
      // Send multiple messages
      await chatApp.connect(user1).sendMessage(user2Address, "Message 1", "hash1");
      await chatApp.connect(user2).sendMessage(user1Address, "Message 2", "hash2");
      await chatApp.connect(user1).sendMessage(user2Address, "Message 3", "hash3");

      const conversation = await chatApp.getConversation(user1Address, user2Address);
      expect(conversation.length).to.equal(3);

      expect(conversation[0].content).to.equal("Message 1");
      expect(conversation[1].content).to.equal("Message 2");
      expect(conversation[2].content).to.equal("Message 3");
    });

    it("Should mark message as read", async function () {
      await chatApp.connect(user1).sendMessage(user2Address, "test", "hash");

      let messages = await chatApp.getMessages(user2Address, user1Address);
      expect(messages[0].isRead).to.equal(false);

      await chatApp.connect(user2).markMessageAsRead(user1Address, 0);

      messages = await chatApp.getMessages(user2Address, user1Address);
      expect(messages[0].isRead).to.equal(true);
    });

    it("Should get unread message count", async function () {
      await chatApp.connect(user1).sendMessage(user2Address, "msg1", "hash1");
      await chatApp.connect(user1).sendMessage(user2Address, "msg2", "hash2");

      expect(await chatApp.getUnreadCount(user2Address, user1Address)).to.equal(2);

      await chatApp.connect(user2).markMessageAsRead(user1Address, 0);

      expect(await chatApp.getUnreadCount(user2Address, user1Address)).to.equal(1);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle long usernames", async function () {
      const longUsername = "a".repeat(50);
      await expect(chatApp.connect(user1).createAccount(longUsername)).to.not.be.reverted;
    });

    it("Should handle long messages", async function () {
      await chatApp.connect(user1).createAccount("user1");
      await chatApp.connect(user2).createAccount("user2");
      await chatApp.connect(user1).addFriend(user2Address);

      const longMessage = "a".repeat(1000);
      await expect(chatApp.connect(user1).sendMessage(user2Address, longMessage, "hash")).to.not.be.reverted;
    });

    it("Should handle multiple conversations", async function () {
      // Create multiple users and conversations
      await chatApp.connect(user1).createAccount("user1");
      await chatApp.connect(user2).createAccount("user2");
      await chatApp.connect(user3).createAccount("user3");

      await chatApp.connect(user1).addFriend(user2Address);
      await chatApp.connect(user1).addFriend(user3Address);

      await chatApp.connect(user1).sendMessage(user2Address, "msg to user2", "hash1");
      await chatApp.connect(user1).sendMessage(user3Address, "msg to user3", "hash2");

      expect((await chatApp.getConversation(user1Address, user2Address)).length).to.equal(1);
      expect((await chatApp.getConversation(user1Address, user3Address)).length).to.equal(1);
    });
  });
});
