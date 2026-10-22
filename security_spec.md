# Security Specification for Nova Rework

## Data Invariants
1. Only users with ID 1 can access the admin panel.
2. User ID 1 cannot be banned or muted.
3. Messages can only be edited by the sender.
4. Users can only read chats they are members of.
5. Bans prevent all write operations and most read operations.
6. Mutes prevent message creation.
7. System config (numeric ID tracking) can only be incremented by the first registration or by the system (via strict rules).

## The Dirty Dozen Payloads
1. User with ID 2 trying to ban User with ID 1.
2. User trying to edit a message they didn't send.
3. Unauthenticated user trying to read messages.
4. Banned user trying to send a message.
5. Muted user trying to send a message.
6. User trying to join a group they weren't invited to (if private, though we'll keep it simple for now).
7. User trying to set their own numeric ID to 1 during registration.
8. User trying to change their role/isAdmin status (N/A but numeric ID 1 is the key).
9. User trying to delete someone else's account.
10. User trying to read another user's PII (email).
11. User trying to send a message to a chat they are not in.
12. User trying to update the global system config directly.

## The Test Runner
(I will implement the rules that block these)
