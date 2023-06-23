---
layout: post
published: true
title: 'Optimizer Bug Regarding Memory Side Effects of Inline Assembly'
date: '2022-06-15'
author: Solidity Team
category: Security Alerts
---

On June 5, 2022, [John Toman of the Certora development team reported an optimizer bug](https://medium.com/certora/overly-optimistic-optimizer-certora-bug-disclosure-2101e3f7994d)
that can cause memory writes in inline assembly blocks to be incorrectly removed
under certain conditions.

The bug was introduced in Solidity 0.8.13 with a new Yul optimizer step meant to
remove unused writes to memory and storage.

We assigned the bug a severity of "medium".

## Which Contracts are Affected?

The Yul optimizer considers all memory writes in the outermost Yul block that are
never read from as unused and removes them. This is valid when that Yul block is
the entire Yul program, which is always the case for the Yul code generated by the
new via-IR pipeline. Inline assembly blocks are never optimized in isolation when
using that pipeline. Instead they are optimized as a part of the whole Yul input.

However, the legacy code generation pipeline (which is still the default) runs the
Yul optimizer individually on an inline assembly block if the block does not refer
to any variables defined in the surrounding Solidity code. Consequently, memory
writes in such inline assembly blocks are removed as well, if the written memory is
never read from in the same assembly block, even if the written memory is accessed
later, for example by a subsequent inline assembly block.

Fortunately, the fact that the legacy code generation pipeline does not run the Yul
optimizer at all on inline assembly blocks that do access Solidity variables,
reduces the number of affected cases significantly. Most inline assembly blocks either
read or write values from or to variables defined in the surrounding Solidity code,
are entirely self-contained, or take over the program flow until the end of
the transaction. Thereby, the bug is unlikely to occur in practice and its adverse
effects should in most cases be easily detectable in tests. However,
since the consequences in affected cases can be severe, we assigned it a severity
of "medium".

In the following example, the legacy code generation pipeline with enabled optimizer will
remove the `mstore` instruction and the function `f` will return zero:

```solidity
contract C {
    function f() external pure returns (uint256 x) {
        assembly {
            mstore(0, 0x42)
        }
        assembly {
            x := mload(0)
        }
    }
}
```

However, if the same memory is either read again in the same inline assembly block
or if the inline assembly block accesses any local Solidity variables, the bug is
not present. Both is the case in the following example, so `f` will return
`0x42` as expected:

```solidity
contract C {
    function f() external pure returns (uint256 x) {
        assembly {
            mstore(0, 0x42)
            x := mload(0)
        }
    }
}
```

In the following example, the first `mstore` will not be removed, since the written memory
is read again by the `return`. The second `mstore` on the other hand will be removed, since the memory
it writes is never read again. In this case, this is a valid optimization and the example is not adversely
affected by the bug. Generally, any assembly block that terminates the transaction or does not have memory side-effects that
need to be observed afterwards is unaffected.

```solidity
contract C {
    function f() external {
        assembly {
            mstore(0, 0x42)  // This write will be kept, since the return below reads from the memory.
            mstore(32, 0x21) // This will be removed, but that is valid since the memory is never read again.
            return(0, 32)
        }
    }
}
```

The most dangerous cases affected by the bug are those, in which fixed memory offsets are used to store intermediate
values in one assembly block (e.g. in a helper function), which are then only used in a subsequent assembly block.

```solidity
contract C {
    function callHelper() internal view {
        assembly {
            let ret := staticcall(gas(), address(), 0, 0, 0, 0)
            if eq(ret, 0) {
                revert(0, 0)
            }
            returndatacopy(0, 0, 128) // This will be removed due to the bug.
        }
    }
    function f() external view returns(uint256 x) {
        callHelper();
        assembly {
            // This consumes the memory write by the helper, which was incorrectly removed.
            x := keccak256(0, 128)
        }
    }
}
```

However, we found it to be uncommon for such patterns to occur: usually, an assembly block either reads from or writes
to at least one local Solidity variable, consumes the memory it writes directly, or takes over control until the end of
the transaction. This is partly due to the fact that using fixed memory offsets for intermediate values between assembly
blocks is in itself dangerous, since you need to ensure that the Solidity code between the assembly blocks does not overwrite
the memory again.

A potentially severely affected pattern would be to reserve static memory at the beginning of the transaction by a write to the
free memory pointer (which will be removed due to the bug):

```solidity
contract C {
    // Modifier meant to allow the safe use of 64 bytes of static memory at offset 0x80.
    modifier reserveStaticMemory() {
        assembly {
            // Assert that this is called with the expected initial value of the free memory pointer.
            if iszero(eq(mload(0x40), 0x80)) { revert(0, 0) }
            // Reserve 64 bytes of memory between 0x80 and 0xC0.
            mstore(0x40, 0xC0) // This write will be removed due to the bug.
        }
        _;
    }
    function someHelper(bytes calldata s) internal pure {
        bytes32 hash = keccak256(s);
        assembly {
            // Store some intermediate values to the supposedly reserved memory.
            mstore(0x80, 0x12345678)
            mstore(0xA0, hash)
        }
    }
    function f(bytes calldata s, bytes calldata y) external view reserveStaticMemory returns(uint256 x) {
        someHelper(s);
        bytes32 hash = keccak256(y); // Since the free memory pointer was not actually bumped, this will overwrite the memory at 0x80.
        assembly {
            x := keccak256(0x80, 0x40) // The memory expected here will have been overwritten.
            x := xor(x, hash)
        }
    }
}
```