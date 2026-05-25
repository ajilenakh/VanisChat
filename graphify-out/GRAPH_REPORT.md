# Graph Report - VanisChat  (2026-05-26)

## Corpus Check
- 91 files · ~42,884 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 513 nodes · 641 edges · 48 communities (29 shown, 19 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1fff62e9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Web UI Core|Web UI Core]]
- [[_COMMUNITY_API Validation Schemas|API Validation Schemas]]
- [[_COMMUNITY_Lobby & API Client|Lobby & API Client]]
- [[_COMMUNITY_Biome Format Config|Biome Format Config]]
- [[_COMMUNITY_API Runtime Deps|API Runtime Deps]]
- [[_COMMUNITY_Root Dev Tooling|Root Dev Tooling]]
- [[_COMMUNITY_System Architecture|System Architecture]]
- [[_COMMUNITY_Web Dependencies|Web Dependencies]]
- [[_COMMUNITY_Crypto Module|Crypto Module]]
- [[_COMMUNITY_DB & Auth Middleware|DB & Auth Middleware]]
- [[_COMMUNITY_Message Display|Message Display]]
- [[_COMMUNITY_Crypto & CI Config|Crypto & CI Config]]
- [[_COMMUNITY_App Shell & Errors|App Shell & Errors]]
- [[_COMMUNITY_TS Strict Config|TS Strict Config]]
- [[_COMMUNITY_React Providers|React Providers]]
- [[_COMMUNITY_Package Metadata|Package Metadata]]
- [[_COMMUNITY_Migration Plans|Migration Plans]]
- [[_COMMUNITY_HTTP Error Classes|HTTP Error Classes]]
- [[_COMMUNITY_Chat ErrorBoundary|Chat ErrorBoundary]]
- [[_COMMUNITY_Web TSConfig|Web TSConfig]]
- [[_COMMUNITY_API TSConfig|API TSConfig]]
- [[_COMMUNITY_Crypto TSConfig|Crypto TSConfig]]
- [[_COMMUNITY_Test Setup|Test Setup]]
- [[_COMMUNITY_TSConfig Hierarchy|TSConfig Hierarchy]]
- [[_COMMUNITY_Husky Hooks|Husky Hooks]]
- [[_COMMUNITY_E2E Encryption|E2E Encryption]]
- [[_COMMUNITY_Web Biome Config|Web Biome Config]]
- [[_COMMUNITY_Tooling Biome Config|Tooling Biome Config]]
- [[_COMMUNITY_Toast System|Toast System]]
- [[_COMMUNITY_Room Architecture|Room Architecture]]
- [[_COMMUNITY_Husky Shell|Husky Shell]]
- [[_COMMUNITY_Root Biome Config|Root Biome Config]]
- [[_COMMUNITY_VanisChat Project|VanisChat Project]]
- [[_COMMUNITY_Web TSConfig Base|Web TSConfig Base]]
- [[_COMMUNITY_Vite Config|Vite Config]]
- [[_COMMUNITY_Web Biome Overrides|Web Biome Overrides]]
- [[_COMMUNITY_Web Package|Web Package]]
- [[_COMMUNITY_ApiError Class|ApiError Class]]
- [[_COMMUNITY_Message Skeleton|Message Skeleton]]
- [[_COMMUNITY_Chat Skeleton|Chat Skeleton]]
- [[_COMMUNITY_Error Factory|Error Factory]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `ChatPage()` - 16 edges
3. `request()` - 14 edges
4. `VanisChat — Agents guide` - 13 edges
5. `useToast()` - 9 edges
6. `useRoomContext()` - 9 edges
7. `Room CRUD Routes` - 9 edges
8. `scripts` - 7 edges
9. `Message` - 7 edges
10. `RoomSocket` - 7 edges

## Surprising Connections (you probably didn't know these)
- `request()` --calls--> `fetch()`  [INFERRED]
  apps/web/src/lib/api.ts → packages/api/src/dev.ts
- `Biome linter/formatter configuration` --conceptually_related_to--> `ChatPage()`  [INFERRED]
  tooling/biome-config.json → apps/web/src/components/Chat/ChatPage.tsx
- `encrypt()` --implements--> `PBKDF2 + AES-GCM encryption scheme`  [EXTRACTED]
  packages/crypto/src/encrypt.ts → overhaul.md
- `decrypt()` --implements--> `PBKDF2 + AES-GCM encryption scheme`  [EXTRACTED]
  packages/crypto/src/decrypt.ts → overhaul.md
- `deriveKey()` --implements--> `PBKDF2 + AES-GCM encryption scheme`  [EXTRACTED]
  packages/crypto/src/derive-key.ts → overhaul.md

## Hyperedges (group relationships)
- **Room Entry Flow** — lobby_lobby_page_lobby_page, lobby_create_room_form_create_room_form, lobby_join_room_form_join_room_form, context_room_context_room_provider [INFERRED 0.95]
- **Real-Time Messaging Protocol** — lib_ws_room_socket, lib_ws_ws_in_message, lib_ws_ws_out_message, hooks_use_room_use_room, hooks_use_messages_use_messages [INFERRED 0.95]
- **API Client Layer** — lib_api_request, lib_api_create_room, lib_api_join_room, lib_api_leave_room, lib_api_get_messages, lib_api_validate_session, lib_api_request_upload_url, lib_api_api_error, lib_api_message [EXTRACTED 1.00]
- **Chat UI component hierarchy (ChatPage -> Header, List, Input -> Item -> Image/File)** — chat_chatpage_chatpage, chat_chatheader_chatheader, chat_messagelist_messagelist, chat_messageinput_messageinput, chat_messageitem_messageitem, chat_filemessage_imagemessage, chat_filemessage_filedownload [INFERRED 0.85]
- **E2EE pipeline: key derive from password -> encrypt message -> send -> async decrypt in MessageList** — chat_chatpage_e2ee_derivation, chat_chatpage_chatpage, chat_messagelist_messagelist, chat_messagelist_async_decryption [INFERRED 0.85]
- **Husky internal git hook runner (14 hook files delegate to h)** — _h_runner, _huskysh_deprecation, _h_hook_system [INFERRED 0.85]
- **API Core Runtime Stack** — api_src_dev_entry, api_src_index_app, api_src_routes_room, api_src_routes_health, api_src_ws_room_handler, api_src_middleware_auth, api_src_middleware_rate_limit, api_src_db_index, api_src_db_schema, api_src_lib_r2, api_src_lib_validate, api_src_lib_errors [INFERRED 0.85]
- **Auth Subsystem (Tokens+Middleware+DB)** — api_src_routes_room, api_src_middleware_auth, api_src_ws_room_handler, api_src_db_schema, api_concept_token_auth [INFERRED 0.85]
- **Test Infrastructure** — api_src_tests_room_test, api_src_tests_health_test, api_src_tests_setup, api_vitest_config, api_concept_test_infra [INFERRED 0.85]
- **PBKDF2 key derivation + AES-GCM encrypt/decrypt flow** — crypto_derivekey_function, crypto_encrypt_function, crypto_decrypt_function, crypto_generatesalt_function, crypto_arraybuffertobase64_function, crypto_base64toarraybuffer_function [EXTRACTED 1.00]
- **VanisChat 5-phase migration sequence** — phase1_foundation_spec, phase2_core_features_spec, phase3_polish_spec, phase4_quality_spec, phase5_decommission_spec [EXTRACTED 1.00]

## Communities (48 total, 19 thin omitted)

### Community 0 - "Web UI Core"
Cohesion: 0.06
Nodes (35): ChatHeader(), ChatHeaderProps, Room expiry countdown with live 1s update interval, ChatPage(), ChatPage orchestrates crypto, presence, message, connection hooks, E2EE key derivation from room password, MessageInput(), Presigned URL upload with XHR progress tracking (+27 more)

### Community 1 - "API Validation Schemas"
Cohesion: 0.07
Nodes (34): getDb(), messages, rooms, roomTokens, generatePresignedPutUrl(), getSignatureKey(), hmacSha256(), PresignedUrlOptions (+26 more)

### Community 2 - "Lobby & API Client"
Cohesion: 0.09
Nodes (29): MessageInputProps, defaultState, RoomContext, RoomContextValue, RoomProvider(), RoomState, useRoomContext(), useTheme() (+21 more)

### Community 3 - "Biome Format Config"
Cohesion: 0.07
Nodes (27): noUnusedVariables, extends, files, ignore, formatter, enabled, indentStyle, indentWidth (+19 more)

### Community 4 - "API Runtime Deps"
Cohesion: 0.07
Nodes (26): dependencies, drizzle-orm, hono, @libsql/client, @paralleldrive/cuid2, @vanischat/crypto, zod, devDependencies (+18 more)

### Community 5 - "Root Dev Tooling"
Cohesion: 0.08
Nodes (25): author, devDependencies, @biomejs/biome, drizzle-kit, husky, lint-staged, @types/node, typescript (+17 more)

### Community 6 - "System Architecture"
Cohesion: 0.11
Nodes (23): Drizzle ORM Data Layer, In-Memory State (WS+RateLimit), R2 Presigned Upload Pattern, Hono Mounted Routes Pattern, Test Infra (Bun Shim+File SQLite), Invite+Session Token Auth, WS Room System (In-Memory State), Drizzle ORM Config (+15 more)

### Community 7 - "Web Dependencies"
Cohesion: 0.08
Nodes (23): dependencies, date-fns, lucide-react, react, react-dom, react-router-dom, @vanischat/crypto, devDependencies (+15 more)

### Community 8 - "Crypto Module"
Cohesion: 0.16
Nodes (15): decrypt(), deriveKey(), encrypt(), generateSalt(), arrayBufferToBase64(), base64ToArrayBuffer(), chars, salt (+7 more)

### Community 9 - "DB & Auth Middleware"
Cohesion: 0.12
Nodes (19): healthRoutes, roomRoutes, close(), message(), app, now, body, { roomId, inviteToken } (+11 more)

### Community 10 - "Message Display"
Cohesion: 0.15
Nodes (15): FileDownload(), FileMessageProps, ImageMessage(), MessageItem(), MessageItemProps, MessageListProps, ChatSkeleton(), useMessages Hook (+7 more)

### Community 11 - "Crypto & CI Config"
Cohesion: 0.21
Nodes (15): arrayBufferToBase64(), base64ToArrayBuffer(), decrypt(), deriveKey(), encrypt(), generateSalt(), @vanischat/crypto index.ts, @vanischat/crypto (+7 more)

### Community 12 - "App Shell & Errors"
Cohesion: 0.19
Nodes (6): ErrorBoundary, ErrorBoundaryProps, ErrorBoundaryState, ErrorFallback(), ErrorFallbackProps, RoomErrorFallback()

### Community 13 - "TS Strict Config"
Cohesion: 0.11
Nodes (17): compilerOptions, declaration, declarationMap, esModuleInterop, exactOptionalPropertyTypes, forceConsistentCasingInFileNames, isolatedModules, module (+9 more)

### Community 14 - "React Providers"
Cohesion: 0.15
Nodes (15): ErrorBoundary Class, ErrorFallback Component, RoomErrorFallback Component, RoomProvider, useRoomContext Hook, ThemeProvider, useTheme Hook, createRoom API (+7 more)

### Community 15 - "Package Metadata"
Cohesion: 0.18
Nodes (10): devDependencies, vitest, main, name, private, scripts, test, type (+2 more)

### Community 16 - "Migration Plans"
Cohesion: 0.22
Nodes (10): 5-phase migration strategy (Phase 1-5), Phase 1 Foundation Plan, Phase 1 Foundation Spec, Phase 2 Core Features Plan, Phase 2 Core Features Spec, Phase 3 Polish Plan, Phase 3 Polish Spec, Phase 4 Quality Spec (+2 more)

### Community 18 - "Chat ErrorBoundary"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 19 - "Web TSConfig"
Cohesion: 0.25
Nodes (7): compilerOptions, jsx, outDir, rootDir, types, extends, include

### Community 20 - "API TSConfig"
Cohesion: 0.29
Nodes (6): compilerOptions, outDir, rootDir, types, extends, include

### Community 21 - "Crypto TSConfig"
Cohesion: 0.33
Nodes (5): compilerOptions, outDir, rootDir, extends, include

### Community 22 - "Test Setup"
Cohesion: 0.33
Nodes (4): __dirname, __filename, g, TEST_DB_PATH

### Community 23 - "TSConfig Hierarchy"
Cohesion: 0.50
Nodes (4): Workspace TSConfig Inheritance, API TSConfig, Crypto TSConfig, Shared TypeScript Base Config

### Community 24 - "Husky Hooks"
Cohesion: 1.00
Nodes (3): Husky git hook lifecycle (14 hooks source this runner), Husky git hook runner (h), Husky v10 deprecation warning

### Community 25 - "E2E Encryption"
Cohesion: 0.67
Nodes (3): useCryptoKey Hook, End-to-End Encryption Architecture, Password-Derived Key Scheme

### Community 44 - "Community 44"
Cohesion: 0.09
Nodes (21): API architecture, Code style (Biome), code:sh (bun run lint                              # Biome check .), code:sh (# API (Bun dev, port 3001, includes WebSocket)), code:block3 (type(optional-scope): description), Commit convention, Continuous update, Deployment (GitHub Actions) (+13 more)

## Knowledge Gaps
- **266 isolated node(s):** `PreToolUse`, `Workspace packages`, `code:sh (bun run lint                              # Biome check .)`, `code:sh (# API (Bun dev, port 3001, includes WebSocket))`, `API architecture` (+261 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `request()` connect `Lobby & API Client` to `Web UI Core`, `Message Display`, `React Providers`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `fetch()` connect `Lobby & API Client` to `DB & Auth Middleware`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Why does `ChatPage()` connect `Web UI Core` to `Lobby & API Client`, `Chat ErrorBoundary`, `App Shell & Errors`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `ChatPage()` (e.g. with `ChatHeader()` and `MessageList()`) actually correct?**
  _`ChatPage()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `PreToolUse`, `Workspace packages`, `code:sh (bun run lint                              # Biome check .)` to the rest of the system?**
  _269 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Web UI Core` be split into smaller, more focused modules?**
  _Cohesion score 0.06485671191553545 - nodes in this community are weakly interconnected._
- **Should `API Validation Schemas` be split into smaller, more focused modules?**
  _Cohesion score 0.06585365853658537 - nodes in this community are weakly interconnected._