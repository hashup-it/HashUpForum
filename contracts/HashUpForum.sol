// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

import "./HashUpToken.sol";
import "./HashUpNicknames.sol";

interface IHashUpForum {
    function addNewPost(string memory message) external returns (bool success);

    function likePost(uint256 _postIndex) external returns (bool success);

    function dislikePost(uint256 _postIndex) external returns (bool success);

    function getIsPostReacted(uint256 _postIndex, address user)
        external
        view
        returns (bool);

    function getCurrentPostIndex() external view returns (uint256);

    function getPost(uint256 _postIndex)
        external
        view
        returns (
            string memory,
            string memory,
            int256,
            uint256,
            uint256
        );
}

contract HashUpForum is IHashUpForum {
    address public owner;
    uint256 public postIndex;

    HashUp hashUpToken;
    HashupNicknames hashUpNicknames;

    event newPost(
        uint256 blockNumber,
        address userAddress,
        string userNick,
        string userPost
    );
    event like(uint256 postIndex, address user);
    event dislike(uint256 postIndex, address user);

    constructor(HashUp _hashUpToken, HashupNicknames _hashUpNicknames) {
        owner = msg.sender;
        hashUpToken = _hashUpToken;
        hashUpNicknames = _hashUpNicknames;
        postIndex = 0;
    }

    mapping(uint256 => string) post;
    mapping(uint256 => string) postAuthor;
    mapping(uint256 => int256) postPower;
    mapping(address => uint256) lastPost;
    mapping(uint256 => uint256) likes;
    mapping(uint256 => uint256) dislikes;
    mapping(uint256 => mapping(address => bool)) isPostReacted;

    function addNewPost(string memory message)
        external
        override
        returns (bool success)
    {
        string memory nick = hashUpNicknames.getNickname(msg.sender);

        if (keccak256(bytes(nick)) != keccak256(bytes(""))) {
            post[postIndex] = message;
            postAuthor[postIndex] = nick;
            postPower[postIndex] = int256(hashUpToken.balanceOf(msg.sender));

            //Prevents like od dislike by author
            isPostReacted[postIndex][msg.sender] = true;

            emit newPost(block.number, msg.sender, nick, message);
            postIndex += 1;
            return true;
        }
        return false;
    }

    function likePost(uint256 _postIndex)
        external
        override
        returns (bool success)
    {
        require(
            _postIndex <= postIndex,
            "You can't like post that doesn't' exist!"
        );
        require(
            isPostReacted[_postIndex][msg.sender] == false,
            "You already reacted"
        );

        uint256 userPower = hashUpToken.balanceOf(msg.sender);
        likes[_postIndex] += 1;
        postPower[_postIndex] = postPower[_postIndex] + int256(userPower);

        // if(postPower[_postIndex] >= 1)

        emit like(postIndex, msg.sender);
        return true;
    }

    function dislikePost(uint256 _postIndex)
        external
        override
        returns (bool success)
    {
        require(
            _postIndex <= postIndex,
            "You can't like post that doesn't' exist!"
        );
        require(
            isPostReacted[_postIndex][msg.sender] == false,
            "You already reacted"
        );

        uint256 userPower = hashUpToken.balanceOf(msg.sender);
        dislikes[_postIndex] += 1;
        postPower[_postIndex] = postPower[_postIndex] - int256(userPower);
        isPostReacted[_postIndex][msg.sender] = true;

        emit dislike(postIndex, msg.sender);
        return true;
    }

    function getIsPostReacted(uint256 _postIndex, address user)
        external
        view
        override
        returns (bool)
    {
        return isPostReacted[_postIndex][user];
    }

    function getPost(uint256 _postIndex)
        external
        view
        override
        returns (
            string memory,
            string memory,
            int256,
            uint256,
            uint256
        )
    {
        return (
            post[_postIndex],
            postAuthor[_postIndex],
            postPower[_postIndex],
            likes[_postIndex],
            dislikes[_postIndex]
        );
    }

    function getCurrentPostIndex() external view override returns (uint256) {
        return postIndex;
    }
}
