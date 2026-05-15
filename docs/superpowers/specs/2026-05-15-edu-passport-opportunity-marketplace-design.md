# EDU Passport Opportunity Marketplace 产品方向方案

## 1. 核心结论

EDU Passport 不应该继续收窄成只服务学生的 `Student Opportunity Workspace`。更有潜力的方向是回到旧项目的主线，并用当前新项目的技术基础重新升级：

> EDU Passport 是面向教育行业的机会市场，连接学习者、教育工作者、学校、招聘方、活动方和优惠/服务商，帮助需求方发现和跟进机会，帮助供给方发布、管理和转化机会。

当前的 `Workspace`、`Saved`、`Applications`、`Recommendations` 应该保留，但它们只是用户侧执行工作台，不是整个产品的上限。产品主定位应从“学生机会工作台”升级为：

> The education opportunity marketplace for learning, careers, events, and partner offers.

## 2. 为什么要调整

之前的学生机会工作台方案有一个明显问题：用户侧体验是完整的，但商业侧太弱。只服务学生，容易变成内容目录、收藏工具或提醒工具，付费动机不够强，也很难建立供给壁垒。

旧项目的方向更大，也更接近可商业化的教育行业平台：

- 学习者 / 教育工作者可以找工作、活动、优惠、课程和行业机会。
- Business / School / Recruiter 可以发布岗位、管理候选人、购买曝光和会员权益。
- Vendor / Partner 可以发布 Deals、申请 Deal Program、获得线索和转化。
- Admin 可以控制内容质量、赞助位、会员激活、审核和平台治理。

新项目的价值不是推翻旧项目，而是把旧项目里最有商业价值的业务闭环，用更干净的 Next.js / Prisma / PostgreSQL 基础重新实现。

## 3. 产品定位

### 不是

- 不是单纯学生站。
- 不是纯课程平台。
- 不是纯招聘平台。
- 不是纯学生折扣验证平台。
- 不是旧 Flask / Mongo 项目的逐文件重建。

### 应该是

一个教育行业机会市场，第一阶段聚焦四类机会：

- `Courses`: 学习、证书、培训、继续教育机会。
- `Jobs`: 教育行业岗位、实习、兼职、校内/校外工作机会。
- `Events`: 教育展、讲座、培训会、会议、线上活动。
- `Deals`: 学生、教育工作者、学校相关优惠、工具、服务和合作权益。

这些机会统一进入一个市场系统：可发现、可筛选、可保存、可申请/报名/兑换、可跟进、可审核、可推荐、可商业化。

## 4. 用户角色

### Guest

游客用于 SEO 和冷启动流量。可以浏览公开机会、搜索列表、查看详情，但不能保存、跟进、申请或获得个性化推荐。

### Learner / Educator

这是当前用户系统的基础用户。可以完善资料、保存机会、获得推荐、跟进申请和提醒。这里不再只叫 `Student`，因为旧项目的教育工作者、求职者、培训用户都应该被覆盖。

### Business / School / Recruiter

这是未来最重要的付费侧之一。可以发布和管理岗位、查看申请人、购买曝光、升级计划、管理招聘流程。

### Vendor / Partner

服务商、优惠方、活动方或合作伙伴。可以提交 Deals / Events，申请 Deal Program，获得审核通过后的发布资格，未来可以购买赞助位或合作套餐。

### Admin

Admin 负责内容质量和商业化控制：审核机会、管理用户、手动激活 Pro / Business 权益、管理赞助内容、处理低质量或过期内容、监控同步和提交来源。

## 5. 核心业务闭环

### 5.1 需求方机会闭环

用户路径：

1. 访问网站并搜索机会。
2. 注册、邮箱验证、完善资料。
3. 获得推荐或主动筛选机会。
4. 保存机会到 Workspace。
5. 设置状态、优先级、截止日期和下一步行动。
6. 申请岗位、报名活动、学习课程或兑换优惠。
7. 在 Workspace / Applications / Notifications 里持续跟进。

这个闭环保留当前新项目已经完成的用户系统、保存、推荐、申请和通知能力。

### 5.2 供给方发布闭环

Business / School / Vendor 的路径：

1. 创建组织或合作方资料。
2. 提交 Job / Event / Deal / Course。
3. 内容进入 staging / review 状态。
4. Admin 审核、修改、批准、拒绝或精选。
5. 发布后进入公开市场和推荐系统。
6. 供给方查看曝光、申请、报名、线索或兑换数据。
7. 通过会员、赞助位或合作计划获得更多权益。

这是旧项目最值得迁移的方向，也是当前新项目缺失的商业侧能力。

### 5.3 Admin 质量治理闭环

平台不能一开始就完全自动发布。更稳的方式是：

1. Provider sync / manual submission / partner submission 进入待审核。
2. Admin 审核质量、来源、重复、过期、地区、分类和商业价值。
3. 通过后发布为正式 Listing。
4. 低质量内容进入 hidden / needs_review / expired。
5. 高质量内容可被 featured、sponsored 或推荐。

这能避免网站变成低质量聚合站，也为未来商业化保留控制权。

### 5.4 商业化闭环

第一阶段不需要 Stripe 作为上线前提。更实际的商业化路径：

- Free 用户：浏览、保存少量机会、基础跟进。
- Pro 用户：更多跟踪额度、提醒、申请管理、Quick Apply、智能匹配理由。
- Business 计划：发布岗位、管理候选人、更多曝光、更多管理员、基础分析。
- Vendor / Deal Program：提交优惠、审核通过后发布、赞助展示、合作套餐。
- Sponsored Listings：Admin 手动管理赞助位，先验证需求，再接支付系统。

## 6. 当前新项目应该保留的能力

当前 `edupassport.me` 已经有一套更适合继续发展的基础：

- `Listing` 聚合模型，支持 `course/job/event/deal`。
- `Provider` 和 sync 字段，适合继续做数据来源治理。
- `AppUser`、邮箱验证、tier、role、profile。
- `UserProfile` 里的 goals、targetRegions、preferredTypes、onboardingCompletedAt。
- `SavedListing` 已经具备 status、priority、deadlineAt、nextActionAt、note。
- `Application` 已经有基本申请记录。
- `/workspace` 已经能聚合推荐、保存、待行动和申请状态。
- Admin 侧已经有用户、Listing、同步、通知、billing 等基础入口。
- Resend 邮件验证、通知和 cron 体系已经开始形成。

所以新项目不需要重建。方向应该是扩大业务边界，并补上供给方和 Admin 审核闭环。

## 7. 旧项目应该借鉴的能力

旧项目不适合直接迁移代码，但很适合作为业务蓝图。

### 7.1 Jobs / Applications 生命周期

旧项目的岗位申请流程比当前新项目完整，应该借鉴：

- `under_review`
- `shortlisted`
- `screening`
- `interview_scheduled`
- `interviewing`
- `decision_pending`
- `offer_extended`
- `offer_accepted`
- `hired`
- `rejected`
- `withdrawn`

同时逐步加入 interview time、timezone、meeting url、offer letter、contract、reschedule request 等字段。

### 7.2 Business / Vendor 权限和会员额度

旧项目的订阅和额度逻辑很有价值，可以抽象成新的 plan/quota 系统：

- 可发布岗位数量。
- 可发布活动数量。
- 可发布优惠数量。
- 可查看申请人或 educator profile 的次数。
- 可管理的 admin 数量。
- 可使用的模板、统计和赞助权益。

先由 Admin 手动激活，不阻塞 Stripe。

### 7.3 Deals / Events 审核发布

旧项目的 Deals / Events 思路是正确的：不要一开始大规模自动抓取并直接发布，而是先走：

> source / submission -> staging / review -> admin approval -> published

这比完全自动化更适合 EDU Passport 的早期质量控制。

### 7.4 Deal Program

Deal Program 是很有潜力的商业模块。第一阶段可以做轻量版：

- Vendor 提交申请。
- Admin 审核。
- 通过后允许提交 Deals。
- 记录来源、联系人、网站、地区、可用对象、过期时间。

### 7.5 Claimable Business Listing

旧项目 Q2 里提到的 claimable business profile 可以作为中后期增长策略：

- 平台先建立未认领的学校、机构、合作方或招聘方页面。
- 通过邮箱或官方渠道认领。
- 认领后补充资料、发布机会、购买曝光。

这个方向有潜力，但不应作为第一阶段实现重点。

## 8. 暂时不建议迁移的旧功能

为了避免新项目重新变复杂，以下功能不应第一阶段迁移：

- 完整社交 Feed。
- 评论、回复、反应、boost 的完整内容社区体系。
- Credits / affiliate / cash redemption。
- 复杂聊天系统。
- 多管理员组织后台的完整权限体系。
- 原项目的所有 admin 报表。
- 大规模自动 scraping + 自动发布。
- Stripe 复杂订阅。
- 移动 App 逻辑。

这些功能不是没有价值，而是会分散主线。第一阶段必须先把 marketplace、审核、发布、申请、商业权益跑通。

## 9. 推荐信息架构

### Public

- `/`: 教育机会市场首页。
- `/courses`: Courses 机会列表。
- `/jobs`: Jobs 机会列表。
- `/events`: Events 机会列表。
- `/deals`: Deals 机会列表。
- `/listings/[id]`: 统一机会详情页。
- `/pricing`: Pro / Business / Partner 权益说明。
- `/partners` 或 `/deal-program`: 未来 Vendor / Deal Program 入口。

### Authenticated User

- `/workspace`: 个人机会工作台。
- `/for-you`: 推荐机会。
- `/saved`: 已保存机会。
- `/applications`: 申请和报名跟进。
- `/notifications`: 提醒和系统通知。
- `/profile`: 个人资料和偏好。
- `/billing`: 会员状态和升级申请。

### Business / Vendor

第一阶段可以先不完整开放后台，但需要预留：

- `/business`: Business dashboard。
- `/business/listings`: 发布和管理机会。
- `/business/applications`: 查看申请人和线索。
- `/partner/deals`: Vendor 提交和管理 Deals。
- `/partner/events`: Vendor 提交和管理 Events。

### Admin

- `/admin/users`: 用户和会员激活。
- `/admin/listings`: Listing 管理。
- `/admin/submissions`: 提交审核队列。
- `/admin/providers`: 数据源和同步状态。
- `/admin/sponsored`: 赞助位管理。
- `/admin/reports`: 内容质量、过期、低质和投诉。

## 10. 数据模型建议

### AppUser

保留当前 `role` 和 `tier`，但需要更明确地区分用户身份：

- `primaryRole`: learner / educator / business / vendor / admin。
- `userTypes`: 可多选，例如 learner + educator，business + vendor。
- `organizationId`: 未来关联 Business / Vendor / School。

### Organization

新增组织模型，承载 Business、School、Recruiter、Vendor：

- name
- type
- website
- verifiedAt
- ownerUserId
- status
- plan
- quota

### ListingSubmission

新增提交/审核模型，不要让外部提交直接进入正式 Listing：

- type
- source
- submittedByUserId
- organizationId
- payload
- status
- reviewNote
- reviewedBy
- reviewedAt
- publishedListingId

### Application

扩展当前 Application，使 Jobs 的业务闭环更接近真实招聘：

- status 扩展为更细的招聘阶段。
- interviewAt
- interviewTimezone
- meetingUrl
- employerNote
- candidateNote
- offerLetterUrl
- contractUrl
- withdrawnAt

### DealProgramApplication

新增轻量模型：

- organizationId
- contactName
- contactEmail
- website
- proposedOffer
- targetAudience
- status
- reviewedBy
- reviewedAt
- invitationToken

### SponsoredPlacement

后续商业化需要：

- listingId
- organizationId
- placement
- startsAt
- endsAt
- status
- manuallyActivatedBy

## 11. Roadmap

### Phase 1: 定位重构

目标：让网站从学生单点工具升级为教育机会市场。

要做：

- 首页文案从 student-only 改成 education opportunity marketplace。
- 导航继续保留 Courses / Jobs / Events / Deals，但统一表达为 Opportunities。
- Workspace 继续存在，但定位为个人机会工作台。
- Pricing / Billing 文案加入 Learner Pro、Business、Vendor / Partner 的未来权益。

### Phase 2: Marketplace Foundation

目标：补上市场平台最小业务骨架。

要做：

- 扩展用户角色语言：learner / educator / business / vendor。
- 新增 Organization 基础模型。
- 新增 ListingSubmission 审核模型。
- Admin 增加 submission review 页面。
- Business / Vendor 先通过简单表单提交机会。

### Phase 3: Jobs Loop

目标：让 Jobs 成为第一个强业务闭环。

要做：

- 扩展 Application 状态。
- 增加 interview / offer / withdrawn 等字段。
- Business 可以查看自己岗位的申请。
- Admin 可以介入审核和治理岗位质量。

### Phase 4: Deals / Events Supply Loop

目标：把旧项目的 Deals / Events 供给能力迁移到新架构。

要做：

- Deal Program 轻量申请。
- Vendor / Partner 提交 Deals。
- Event 提交和 Admin 审核。
- Published / rejected / needs_review 状态清晰。

### Phase 5: Commercial Layer

目标：开始验证商业化。

要做：

- Admin 手动激活 Pro / Business / Partner 权益。
- Plan / quota 配置。
- Sponsored listing 手动管理。
- 基础曝光、点击、申请、兑换数据。

### Phase 6: Growth Layer

目标：在核心闭环成立后再扩展增长。

要做：

- Claimable business profile。
- Newsletter / marketing collection。
- More provider sync。
- 自动过期、质量评分、重复检测。
- 逐步接入支付系统。

## 12. 第一轮实现建议

第一轮不要试图迁移旧项目所有功能。最正确的第一步是：

> 在当前新项目上实现 Opportunity Marketplace Foundation。

建议第一轮具体范围：

1. 更新首页、导航、核心文案和定价文案，让定位变成教育机会市场。
2. 保留 Workspace，但把它作为用户侧机会跟进工作台，而不是整个产品定义。
3. 新增 Organization 和 ListingSubmission 数据模型。
4. 新增用户侧提交机会入口，支持 Job / Event / Deal / Course。
5. 新增 Admin submission review 页面，通过后发布为 Listing。
6. 扩展 Application 状态，为后续招聘闭环打基础。

这一步完成后，EDU Passport 就不再只是学生收藏工具，而是有了平台型业务的基础：需求方、供给方、审核方和商业化入口都存在。

## 13. 成功指标

### 用户侧

- 注册后完成 profile 的比例。
- 每个用户保存机会数量。
- Workspace 每周回访率。
- 申请、报名、兑换、外链点击数量。

### 供给侧

- 每周提交机会数量。
- 审核通过率。
- Business / Vendor 激活数量。
- 每个组织发布机会数量。

### 平台质量

- 过期机会比例。
- 重复机会比例。
- 低质量/被隐藏内容比例。
- 推荐点击率。

### 商业化

- Pro 激活数量。
- Business / Vendor 询盘数量。
- Sponsored listing 数量。
- Deal Program 申请数量。

## 14. 产品原则

- Marketplace first: 先做市场，不做单点工具。
- Workflow over directory: 用户不是只浏览目录，而是要完成机会相关动作。
- Quality before scale: 早期宁可人工审核，也不要低质量内容泛滥。
- Supply and demand together: 不能只做学生端，必须逐步补供给端。
- Manual monetization first: 没有 Stripe 不影响验证商业需求。
- Rebuild logic, not old code: 借鉴旧项目业务，不搬运旧项目复杂度。

## 15. 需要确认的产品决策

在进入 implementation plan 前，建议先确认这些问题：

1. 首个付费侧优先做 Business / School / Recruiter，还是 Vendor / Deal Program？
2. 首页主文案是否完全去掉 `Student`，改成 `education opportunity marketplace`？
3. Courses 是否保留为一等机会类型，还是降级为内容/推荐来源？
4. Business / Vendor 第一阶段是否需要独立 dashboard，还是先只做提交表单 + Admin 审核？
5. Pro 是否继续面向个人用户，Business / Partner 是否先由 Admin 手动激活？

## 16. 建议结论

我建议 EDU Passport 的大方向确定为：

> Education Opportunity Marketplace + Personal Opportunity Workspace.

也就是：外层是教育机会市场，内层是个人机会工作台。

旧项目的价值在于多角色、多供给、多商业化闭环；新项目的价值在于架构更干净、用户系统和机会跟进已经可用。下一步不应该继续强化 student-only，而应该补上 Organization、Submission Review、Business/Vendor 供给入口和更完整的 Jobs/Application 流程。
