const { assert, expect } = require('chai')
const { web3Utils } = require('web3-utils')
const { solidity } = require('ethereum-waffle')

const HashUp = artifacts.require("HashUp")
const HashUpForum = artifacts.require("HashUpForum")
const HashUpNicknames = artifacts.require("HashUpNicknames")

require('chai').use(require('chai-as-promised')).should()
require('chai').use(solidity)

const {
    tryCatch, 
    errTypes 
} = require('./exceptions.js')

function convertTokens(n) {
    //Hash has 18 decimals.
    return web3.utils.toWei(n, 'ether')
}

function addStrings(str1, str2) {

    let sum = "";  // our result will be stored in a string.

    // we'll need these in the program many times.
    let str1Length = str1.length;
    let str2Length = str2.length;

    // if s2 is longer than s1, swap them.
    if (str2Length > str1Length) {
        let temp = str2;
        str2 = str1;
        str1 = temp;
    }

    let carry = 0;  // number that is carried to next decimal place, initially zero.
    let a;
    let b;
    let temp;
    let digitSum;
    for (let i = 0; i < str1.length; i++) {
        a = parseInt(str1.charAt(str1.length - 1 - i));      // get ith digit of str1 from right, we store it in a
        b = parseInt(str2.charAt(str2.length - 1 - i));      // get ith digit of str2 from right, we store it in b
        b = (b) ? b : 0;                                    // make sure b is a number, (this is useful in case, str2 is shorter than str1
        temp = (carry + a + b).toString();                  // add a and b along with carry, store it in a temp string.
        digitSum = temp.charAt(temp.length - 1);            //
        carry = parseInt(temp.substr(0, temp.length - 1));  // split the string into carry and digitSum ( least significant digit of abSum.
        carry = (carry) ? carry : 0;                        // if carry is not number, make it zero.

        sum = (i === str1.length - 1) ? temp + sum : digitSum + sum;  // append digitSum to 'sum'. If we reach leftmost digit, append abSum which includes carry too.

    }

    return sum;     // return sum

}
contract('HashUpForum', (accounts) => {

    let hashUp, hashUpForum, hashUpNicknames
    let deployer = accounts[0]
    let user = accounts[1] //1000# after transfers at the begining
    let ceo = accounts[2]
    let likeuser = accounts[3] //1000# likes

    const hashUpNicknamesReward = "213700000000000000000"
    const thousandHash = "1000000000000000000000"

    before(async () => {
        hashUp = await HashUp.new()
        hashUpNicknames = await HashUpNicknames.new(hashUp.address)
        hashUpForum = await HashUpForum.new(
            hashUp.address,
            hashUpNicknames.address
        )
    })

    describe('Transferring tokens to contract', async () => {
        it('Transfers correctly', async () => {
            await hashUp.transfer(user, thousandHash, { from: deployer })
            const userBalance = await hashUp.balanceOf(user)
            assert.equal(userBalance.toString(), thousandHash, 'User doesnt get hash')
        })

        it('Transfers Hash to HashUpNicknames', async () => {
            await hashUp.transfer(hashUpNicknames.address, convertTokens('3000000'), { from: deployer })
            const hashUpNicknamesBalance = await hashUp.balanceOf(hashUpNicknames.address)
            assert.equal(hashUpNicknamesBalance.toString(), convertTokens('3000000'), 'User doesnt get hash')
        })
    })

    describe('Testing HashUp Nicknames', async () => {
        it('Login to HashUp', async () => {

            await hashUpNicknames.loginToTheHashUp("ceo", { from: ceo })

            const ceoAddress = await hashUpNicknames.getAddress("ceo")
            assert.equal(ceo, ceoAddress, "Address should be equal")

            const ceoNick = await hashUpNicknames.getNickname(ceo)
            assert.equal("ceo", ceoNick, "Nick should be equal")
            const ceoBalance = await hashUp.balanceOf(ceo)
            assert.equal(hashUpNicknamesReward, ceoBalance, `Login to HashUp should reward user with ${hashUpNicknamesReward}#`)
        })
    })

    describe('Testing HashUpForum', async () => {
        let index = 0;
        let postMessage = "Hello world!"

        it('cheking post index', async () => {
            const postIndex = await hashUpForum.getCurrentPostIndex()
            assert.equal(index, postIndex, "Post index should be 0 after deploy")
        })


        it('add a new post', async () => {
            await hashUpForum.addNewPost(postMessage, { from: ceo })
            index++
            const post = await hashUpForum.getPost(0)
            assert.equal(postMessage, post[0], `Message should be a ${postMessage}`)
            assert.equal("ceo", post[1], "Post author should be a ceo")
            assert.equal(hashUpNicknamesReward, post[2], "Post power should be equal a reward from HashUpNicknames contract")
        })

        it('checking correct post index', async () => {
            const postIndex = await hashUpForum.getCurrentPostIndex()

            assert.equal(index, postIndex, "Post index should be 0 after deploy")
        })

        it('dislike post by user with 1000#', async () => {
                await hashUpForum.dislikePost(0, {from: user}) 

                // const postPowerAfterLikeWith1000Hash = addStrings(hashUpNicknamesReward, thousandHash)

                const post = await hashUpForum.getPost(0)
                assert.equal(postMessage, post[0], `Message should be a ${postMessage}`)
                assert.equal("ceo", post[1], "Post author should be a ceo")
                assert.equal("-786300000000000000000", String(post[2]), "Post power should be equal a reward from HashUpNicknames contract + user balance")
                assert.equal(1, post[4], "Dislike after 1 dislike should be equal 1")
        })

        it('prevents multiple likes', async () => {
            await tryCatch(hashUpForum.likePost(0, {from: user}), errTypes.revert);
        })
    })
})