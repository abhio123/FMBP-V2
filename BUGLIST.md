# FMBP — UI/UX & Functional Requirements

> **Document Type:** Product / UI-UX / Functional Requirements
> **Project:** Find My Business Partner (FMBP)
> **Purpose:** Consolidated list of UI issues, functional improvements, navigation changes, form improvements, search behavior, post lifecycle, and engagement requirements identified during application testing.

---

# 1. Objective

The primary objective of these changes is to make FMBP:

* Easier to understand for first-time users.
* Easier to navigate.
* Less form-heavy and less confusing.
* More relevant to the user's selected category/sub-category.
* Better at showcasing the value of the platform immediately after login.
* Better at distinguishing the user's own posts from other users' posts.
* Better at managing post lifecycle (`Live` / `Completed`).
* Better prepared for future features such as trending posts, recommendations, following, saved posts, and intelligent search.

The application should not feel like a form-filling application.

The user should be able to **enter → explore → understand the platform → decide what they need or offer → create a post**.

---

# 2. Important Product Principle — Home First

## Current Behavior

After login, the user is immediately taken to:

> Tell us about your business

This forces the user into the business/profile creation flow before they have seen the actual value of FMBP.

## Required Behavior

After login, the user should land on the **Home page**.

The experience should be similar to platforms where users can first explore available content/opportunities before creating their own listing.

### Expected Flow

```text
Login
  ↓
Home
  ↓
Explore Opportunities
  ↓
Create Post / Tell us about your business
```

NOT:

```text
Login
  ↓
Tell us about your business
  ↓
Opportunities
```

---

# 3. Proposed Home Page

The Home page should immediately communicate the purpose of FMBP.

## Suggested Structure

```text
------------------------------------------------
                    FMBP
------------------------------------------------

      What are you looking for?

 [ Tell us about your business / Need / Offer ]

------------------------------------------------
             Recent Opportunities
------------------------------------------------

[ Post Card ]

[ Post Card ]

[ Post Card ]

[ Post Card ]

------------------------------------------------
 Home | Opportunities | + | My Business | Menu
------------------------------------------------
```

## Important

The "Tell us about your business" section should become an **optional CTA**, not a mandatory onboarding screen.

Possible wording:

* Tell us about your business
* What are you looking for?
* What do you need?
* What can you offer?
* Tell us what you need or offer

Final wording can be decided during UI implementation.

## Main Goal

A first-time user should see actual posts/opportunities quickly and understand:

> "What can I get from this application?"

---

# 4. Login / Existing User Navigation

## Current Issue

Even when a user has previously logged in, logging in again sometimes temporarily shows:

> Tell us about your business

and then automatically moves to:

> Opportunities

This creates unnecessary navigation and can look like a loading/navigation bug.

## Required Behavior

For an existing user:

```text
Login
 ↓
Home
```

The user should not be forced through onboarding/business setup again.

## New User

Even a new user should preferably land on Home first.

The Home page can contain:

> Tell us about your business

as an optional CTA.

---

# 5. Mobile Number Input

**Reference:** `image-1`

## Issues

1. Phone number alignment is incorrect.
2. A valid mobile number was not accepted.
3. Validation/error behavior needs improvement.

## Requirements

The phone number input should:

* Be correctly aligned.
* Accept valid Indian 10-digit mobile numbers.
* Handle the expected country-code format consistently.
* Provide a clear validation message for invalid numbers.
* Not reject valid numbers because of harmless formatting differences, if those formats are supported.

## Suggested UI

```text
Mobile Number

+91 | [ 9876543210 ]

          Invalid mobile number
```

Error messages should appear below the field and should not break the overall form layout.

---

# 6. Opportunities Page — Empty State

**Reference:** `image-3`

## Issue

The:

> Be the first to post one

message is not properly aligned.

## Required UI

The empty state should be visually centered and properly spaced.

Example:

```text
              [ Illustration ]

           No opportunities yet

         Be the first to post one

             [ Create Post ]
```

Requirements:

* Horizontal alignment should be consistent.
* Vertical spacing should be appropriate.
* Layout should work on different screen sizes.
* Button and text should not overlap.

---

# 7. Category/Sub-Category Form Architecture

## Major Functional Requirement

Forms should **NOT be identical for every sub-category**.

Currently, many sub-categories under:

* Need Something
* Offer Something

appear to use almost the same form.

This should be changed.

---

# 8. Context-Specific Forms

The form should depend on:

```text
Main Category
      +
Sub-Category
      +
User Intent
```

Example:

```text
Offer Something
      ↓
Skilled Individual
      ↓
Sweets Maker
```

should produce a different form from:

```text
Offer Something
      ↓
Influencer
```

---

# 9. Example — Skilled Individual / Sweets Maker

Possible fields:

* Skill/service type
* Specialization
* Experience
* Type of sweets
* Custom orders available
* Bulk orders available
* Work location
* Home-based / shop / on-site
* Service area
* Availability
* Pricing range
* Delivery availability
* Relevant additional information

Example:

```text
Skill
[ Sweets Maker ]

Experience
[ 5+ Years ]

Specialization
[ Indian Sweets ]

Work Type
[ Home Based ]

Service Area
[ Noida ]

Availability
[ Full Time / Part Time ]
```

---

# 10. Example — Influencer

The Influencer form should be different.

Possible fields:

* Platform
* Instagram / YouTube / Facebook / Other
* Followers/subscribers
* Content niche
* Audience location
* Engagement range
* Collaboration type
* Promotional services
* Paid collaboration
* Product promotion
* Brand collaboration
* Portfolio/social profile
* Expected charges

Example:

```text
Platform
[ Instagram ]

Niche
[ Food & Travel ]

Followers
[ 50K - 100K ]

Collaboration Type
[ Brand Promotion ]

Profile
[ Social Media URL ]
```

---

# 11. Example — Investor

Possible fields:

* Investment amount/range
* Preferred business category
* Investment type
* Location preference
* Partnership preference
* Expected involvement
* Business stage
* Equity/profit-sharing preference
* Other requirements

The investor form should not contain fields that are irrelevant to an investor.

---

# 12. Reusable vs Category-Specific Fields

The system should support both:

### Common fields

Fields that are relevant to many posts:

* Location
* Contact preference
* Availability
* Title
* Description
* Photos/documents where applicable

### Category-specific fields

Fields that depend on the selected sub-category.

For example:

```text
Investor → Investment Amount
Influencer → Followers
Skilled Individual → Experience/Skill
Need Staff → Number of Employees
Need Shop → Shop Size/Budget
Need Manufacturer → Manufacturing Capacity
```

The form engine should therefore support a dynamic schema rather than forcing one generic form on every category.

---

# 13. Category/Sub-Category Title Must Be Visible

## Issue

While filling a form, users can forget which category/sub-category they selected.

## Requirement

The selected category and/or sub-category should always be visible at the top of the form.

Example:

```text
← Back

I Need Something
   > Need Staff

Tell us about the staff you need
```

or:

```text
← Back

Need Staff
--------------------

Tell us about your requirement
```

## Objective

The user should always understand:

* Where they are.
* What they selected.
* What information they are entering.

---

# 14. Amount Selection — Toggle Behavior

Applicable fields:

* How much money do you need?
* How much can you invest?
* Budget
* Funding required
* Investment amount
* Similar amount-based options.

## Current Issue

After selecting an option, it cannot be deselected.

## Required Behavior

Amount options should behave like selectable toggles/radio options with the ability to clear the selection.

Example:

```text
How much do you need?

[ ₹50K ] [ ₹1L ] [ ₹5L ] [ ₹10L ] [ Other ]
```

If:

```text
₹1L
```

is selected and the user taps it again, it should become unselected.

## User Should Be Able To

* Select one option.
* Change to another option.
* Deselect the current option.
* Continue without an amount if the field is optional.

If the field is mandatory, validation should happen on `Next`.

---

# 15. Amount — "Other" Must Be Mutually Exclusive

## Current Issue

The user can currently select:

```text
₹1 Lakh
```

and:

```text
Other Amount
```

at the same time.

This creates conflicting data.

## Required Behavior

Only one option should be selected.

Example:

```text
○ ₹50K
○ ₹1 Lakh
○ ₹5 Lakh
○ ₹10 Lakh
○ Other
```

If the user selects:

```text
₹1 Lakh
```

and then selects:

```text
Other
```

the ₹1 Lakh selection must be cleared.

Likewise, selecting ₹5 Lakh should clear "Other".

### Data Rule

```text
selectedAmount = one option OR null
```

Never:

```text
selectedAmount = ₹1 Lakh + Other
```

---

# 16. Post Preview — Modify Instead of Remove

## Current Issue

After filling the form and clicking:

> Next

the Preview screen opens.

There is a button called:

> Remove

This is confusing.

## Required Change

Rename:

```text
Remove
```

to:

```text
Modify
```

## Modify Behavior

When the user clicks `Modify`:

1. Return to the previous form.
2. Preserve all entered values.
3. Allow the user to edit.
4. Return to Preview after clicking `Next` again.

The user should not have to fill the form again.

## Button Layout

```text
----------------------------

        [ Modify ]

        [ Publish ]

----------------------------
```

`Modify` should be immediately above `Publish`.

`Publish` remains the primary action.

---

# 17. Post-Publish Navigation/Header

## Issue

After publishing, when another page opens, the back button at the top appears along with additional tab/navigation text.

This makes the header confusing.

## Requirement

Back navigation and bottom navigation should remain separate.

### Correct

```text
←  Page Title
```

and:

```text
--------------------------------
Home | Opportunities | + | My Business | Menu
--------------------------------
```

### Incorrect

Back arrow + bottom navigation/tab information appearing together in the top header.

---

# 18. Keyboard Handling

## Issue

Path:

```text
Need Something
 → Need Staff
   → More Details
```

The final field:

> Skills Needed

gets hidden behind the keyboard.

## Expected Behavior

When the user taps `Skills Needed`:

* Screen should automatically scroll.
* Focused input should remain visible.
* Keyboard should not cover the input.
* User should be able to see the field while typing.

## Technical Direction

Use an appropriate keyboard-aware scrolling approach such as:

* `KeyboardAvoidingView`
* Keyboard-aware ScrollView
* Automatic scroll-to-focused-input behavior

depending on the current implementation.

---

# 19. Blank Screen After App/Screen Resume

## Issue

While filling the `More Details` form, if:

1. User is entering text.
2. Screen turns off or app goes into background.
3. User reopens the application.

The page can become completely blank.

This appears to happen more frequently while entering text.

The issue was not consistently observed with toggle controls such as:

> GST Bill Required

## Expected Behavior

After resume:

* Same screen should be visible.
* Previously entered data should remain.
* Dynamic form should render correctly.
* Text input should remain functional.
* No blank screen should occur.

## Areas to Investigate

Check:

* React component lifecycle
* App background/foreground handling
* Navigation state
* Dynamic form state
* React Hook Form state
* Async storage/state persistence if applicable
* Conditional rendering
* Keyboard/input state
* Screen unmount/remount
* Runtime exceptions

## Testing Matrix

Test with:

* Text field
* Multiline text field
* Numeric field
* Dropdown
* Toggle
* Checkbox
* Multiple fields
* Long text

---

# 20. Toggle Alignment

## Issue

Toggle buttons in `More Details` are not aligned properly with their corresponding text.

## Expected Layout

```text
GST Bill Required                [ ON ]

Work From Home                   [ OFF ]

Delivery Required                [ ON ]
```

Requirements:

* Label vertically centered with toggle.
* Toggles consistently aligned.
* Equal row spacing.
* Responsive on different screen widths.
* Long labels should not overlap the toggle.

---

# 21. Identify User's Own Posts

## Issue

The user's own post appears in Opportunities along with other users' posts.

This can be acceptable, but the user must be able to identify their own posts.

## Requirement

Add a visual indicator.

Possible labels:

```text
[ MY POST ]
```

or:

```text
[ YOU ]
```

Example:

```text
Need a Business Partner

[ MY POST ]

Looking for a partner for my business...
```

Other users' posts should not display this label.

## Why

If own posts are shown alongside other posts, users need immediate context.

---

# 22. My Business — Show Limited Posts Initially

## Requirement

If a user has many posts, do not display all of them on the main `My Business` section.

Initially display only:

```text
3 posts
```

Example:

```text
My Business

Post 1
Post 2
Post 3

[ See More ]
```

---

# 23. My Business — See More Page

When the user clicks:

> See More

open a dedicated page containing all posts created by that user.

## Tabs

The page should contain:

```text
LIVE | COMPLETED
```

### LIVE

All currently active posts.

### COMPLETED

All posts that have been marked completed.

Example:

```text
My Posts

       LIVE | COMPLETED

------------------------
Need Staff
[ LIVE ]

Need Investor
[ LIVE ]

Need Supplier
[ LIVE ]
------------------------
```

---

# 24. Post Status Lifecycle

A post should have an explicit status.

Recommended lifecycle:

```text
DRAFT
  ↓
PREVIEW
  ↓
LIVE
  ↓
COMPLETED
```

Only relevant statuses need to be exposed to users.

---

# 25. Completed Post Must Show Status

## Current Issue

When the user clicks:

> Mark as Completed

the button disappears.

There is no obvious indication that the post is now completed.

## Required Behavior

After completion, show:

```text
[ COMPLETED ]
```

or:

```text
Status: Completed
```

For active posts:

```text
[ LIVE ]
```

## Status Should Be Visible On

Where appropriate, status should be visible in:

* My Business
* My Posts
* Post detail
* Opportunities listing where relevant

The status should be stored as actual post data, not inferred from whether a button exists.

---

# 26. Service Offering Posts — Specific Titles

## Current Issue

Service posts are receiving generic titles such as:

> Offering a service in Noida

If 200 people offer services in Noida, users could see:

```text
Offering a service in Noida
Offering a service in Noida
Offering a service in Noida
Offering a service in Noida
...
```

This is not useful.

## Required Behavior

The title should describe the actual opportunity/service.

### Examples

Instead of:

```text
Offering a service in Noida
```

use:

```text
Custom Cake Maker Available in Noida
```

```text
Experienced Sweets Maker Available for Bulk Orders
```

```text
Food & Travel Influencer Available for Collaboration
```

```text
Experienced Electrician Available for Residential Work
```

```text
Business Consultant Available for Small Businesses
```

---

# 27. Dynamic Post Title Generation

The title can be generated using structured information collected from the form.

Example:

```text
Category:
Skilled Individual

Skill:
Sweets Maker

Location:
Noida
```

Generated title:

```text
Sweets Maker Available in Noida
```

Another example:

```text
Category:
Influencer

Niche:
Food & Travel

Collaboration:
Brand Promotion
```

Generated title:

```text
Food & Travel Influencer Available for Brand Collaboration
```

## Principle

The title should prioritize:

1. What is being needed/offered.
2. Specific skill/service.
3. Relevant qualifier.
4. Location where useful.

Location should not become the entire title.

---

# 28. Search Improvements

## Current Issue

Search appears to rely too heavily on exact text matching.

Example:

Searching:

```text
invest
```

may find relevant posts.

But searching:

```text
investment
```

may return nothing despite the posts being conceptually related.

## Required Search Behavior

Search should support:

* Case-insensitive search.
* Partial matching.
* Prefix matching.
* Relevant word variations.
* Search across relevant post fields.

### Example

These should be treated as related where appropriate:

```text
invest
investing
investment
investor
```

---

# 29. Searchable Fields

Search can consider:

```text
Post Title
Post Description
Category
Sub-category
Business Name
Skills
Service Name
Location
Relevant Structured Fields
```

The exact fields should be determined based on the application's data model.

---

# 30. Search Implementation — Future Enhancement

The initial implementation can use database-supported flexible text searching.

Later, FMBP can support:

* Full-text search
* Stemming
* Synonyms
* Fuzzy matching
* Typo tolerance
* Semantic search
* AI-powered search

Example future behavior:

```text
User searches:

"someone to put money in my business"

Results may include:

Investor
Investment
Funding
Business Partner
Financing
```

This is a future enhancement, not necessarily required for the first implementation.

---

# 31. Post Interaction / Engagement

## Current Issue

Post cards currently lack meaningful interaction controls.

When opening a post, there are options such as:

* Interested
* Open Chat

Both currently appear to perform essentially the same function.

## Required Direction

Posts should have interaction mechanisms.

Possible options:

```text
♡ Like
💬 Comment
🔖 Save
↗ Share
```

The final set can be finalized during product design.

---

# 32. "Interested" vs "Open Chat"

These two actions should have clearly different purposes.

### Interested

Should indicate:

> "I am interested in this opportunity."

This can become an engagement signal.

### Open Chat

Should:

> Open a conversation with the post owner.

They should not perform the same action.

Potential flow:

```text
Interested
    ↓
Interest recorded

Open Chat
    ↓
Chat with post owner
```

---

# 33. Engagement Data for Future Trending

Post interactions can later become useful signals.

Potential metrics:

```text
Views
Likes
Comments
Saves
Shares
Interested Users
Chats Started
```

These signals can eventually support:

```text
🔥 Trending Opportunities
```

and other discovery mechanisms.

---

# 34. Following Tab

The Opportunities section contains a:

> Following

tab.

Its functionality should be clearly defined.

## Proposed Behavior

Following should show posts from users/businesses/entities that the current user follows.

Example:

```text
User follows:

Raj
ABC Foods
XYZ Consultant
```

Following feed:

```text
Raj's new post
ABC Foods' new post
XYZ Consultant's new post
```

## Follow Action

A user should have a clear `Follow` action on the relevant user/business profile.

---

# 35. Saved Tab

The Opportunities section also contains:

> Saved

## Proposed Behavior

When a user saves a post:

```text
Post
 ↓
🔖 Save
 ↓
Saved
```

the post should appear in:

```text
Opportunities
   ↓
Saved
```

## Saved Tab

Only posts explicitly saved by the current user should appear there.

---

# 36. Opportunities Tabs

Suggested structure:

```text
All | Following | Saved
```

### All

All relevant opportunities.

### Following

Posts from followed users/businesses.

### Saved

Posts saved by the current user.

The exact ordering/filtering rules can be finalized separately.

---

# 37. First-Time User Experience

The first-time user journey should be simple.

### Recommended Flow

```text
Login
   ↓
Home
   ↓
See Recent Opportunities
   ↓
Understand FMBP
   ↓
Optional:
"Tell us what you need or offer"
   ↓
Create Post
```

The user should not be forced to understand the complete FMBP structure before seeing actual opportunities.

---

# 38. Form Navigation

Every form should clearly communicate:

```text
Where am I?
What am I filling?
What happens next?
Can I go back?
Will my data be preserved?
```

Recommended structure:

```text
← Back

I Need Something
Need Staff

-------------------------

Tell us about your requirement

[ Field ]

[ Field ]

[ Field ]

-------------------------

              [ Next ]
```

---

# 39. Form Data Preservation

Form data should not be lost when:

* User presses Back.
* User navigates temporarily.
* Keyboard opens/closes.
* Screen locks.
* Application moves to background.
* Application returns from background.
* User modifies a post from Preview.

The form should preserve the current data for the duration of the relevant flow.

---

# 40. Preview Flow

Recommended flow:

```text
Form
 ↓
Next
 ↓
Preview
 ↓
Modify ←──────┐
 ↓             │
Publish        │
               │
               └── Back to same form
```

The `Modify` action must preserve all previously entered values.

---

# 41. Post Creation Flow

Recommended overall flow:

```text
Home
 ↓
Create Post
 ↓
Need Something / Offer Something
 ↓
Category
 ↓
Sub-category
 ↓
Context-specific Form
 ↓
More Details
 ↓
Preview
 ↓
Modify OR Publish
 ↓
LIVE
```

After the requirement has been fulfilled:

```text
LIVE
 ↓
Mark as Completed
 ↓
COMPLETED
```

---

# 42. UI Consistency Requirements

Across all screens:

* Consistent spacing.
* Consistent typography.
* Consistent button styles.
* Consistent field alignment.
* Consistent header behavior.
* Consistent bottom navigation.
* Consistent error handling.
* Consistent loading indicators.
* Consistent empty states.

---

# 43. Error Handling

Errors should be:

* Specific.
* Human-readable.
* Displayed near the relevant field.
* Removed when the issue is corrected.

Avoid generic errors such as:

```text
Something went wrong
```

when the actual problem is known.

Prefer:

```text
Please enter a valid 10-digit mobile number.
```

or:

```text
Please select an investment amount.
```

---

# 44. Empty States

Every major listing should have a meaningful empty state.

Examples:

### Opportunities

```text
No opportunities found.

Be the first to post one.

[ Create Post ]
```

### Saved

```text
You haven't saved any posts yet.

[ Explore Opportunities ]
```

### Following

```text
No posts from people you follow yet.

[ Explore People ]
```

### Completed

```text
You don't have any completed posts yet.
```

---

# 45. Post Card Information

A post card should ideally provide enough information for the user to understand the opportunity without opening the post.

Possible information:

```text
[ Category ]

Specific Post Title

Short summary

Location

Relevant key information

[ LIVE / COMPLETED ]

[ MY POST ]       ← if applicable

♡   💬   🔖
```

The exact design can be finalized according to available screen space.

---

# 46. Own Post + Status Example

Example:

```text
------------------------------------
Need a Business Partner
------------------------------------

[ MY POST ]       [ LIVE ]

Looking for a business partner
for my food business.

📍 Noida

♡  💬  🔖
------------------------------------
```

After completion:

```text
------------------------------------
Need a Business Partner
------------------------------------

[ MY POST ]       [ COMPLETED ]

...
------------------------------------
```

---

# 47. Recommended Backend/Data Considerations

The UI changes above require appropriate backend support.

A post should ideally contain information such as:

```text
post_id
user_id
category_id
subcategory_id
title
description
location
status
created_at
updated_at
completed_at
```

Depending on the category:

```text
structured category-specific data
```

can be stored separately or using the application's existing dynamic-form architecture.

---

# 48. Post Status

Recommended status values:

```text
DRAFT
LIVE
COMPLETED
```

`PREVIEW` does not necessarily need to be persisted as a database status if Preview is only a temporary UI state.

---

# 49. User/Post Relationship

The backend should make it easy to determine:

```text
currentUser.id == post.userId
```

This allows the UI to show:

```text
[ MY POST ]
```

and provide appropriate actions.

---

# 50. Interaction Data Model

For future engagement features, consider supporting relationships such as:

```text
PostLike
PostSave
PostInterest
PostComment
PostShare
PostView
Follow
```

The exact implementation can be finalized based on product requirements.

---

# 51. Security / Authorization

Actions must be authorized server-side.

For example:

### Mark Completed

Only the post owner should be able to mark their own post as completed.

### Modify

Only the post owner should be able to modify their post.

### Delete

Only the appropriate authorized user should be able to delete their own post.

Do not rely solely on hiding buttons in the frontend.

---

# 52. Search Performance

As the number of posts grows, avoid implementing search in a way that requires downloading all posts to the mobile application and filtering locally.

Search should eventually be handled efficiently at the backend/database/search layer.

---

# 53. Mobile Responsiveness

All screens should be tested against:

* Small Android phones.
* Large Android phones.
* Different screen aspect ratios.
* Different font scaling settings.
* Keyboard open/closed.
* Portrait orientation.

Particular attention should be given to:

* Headers.
* Bottom navigation.
* Toggle rows.
* Form fields.
* Buttons.
* Empty states.
* Post cards.

---

# 54. Testing Checklist

## Authentication

* [ ] Valid Indian mobile number accepted.
* [ ] Invalid mobile number rejected.
* [ ] Mobile input correctly aligned.
* [ ] Existing user goes directly to Home.
* [ ] New user goes to Home.
* [ ] No unwanted onboarding redirect.

## Home

* [ ] Home opens after login.
* [ ] Opportunities/posts are visible.
* [ ] CTA for business/need/offer is available.
* [ ] Bottom navigation works.

## Categories

* [ ] Category title visible.
* [ ] Sub-category title visible.
* [ ] Correct form loads for each sub-category.
* [ ] Irrelevant fields are not displayed.

## Amount Fields

* [ ] One option can be selected.
* [ ] Selected option can be deselected.
* [ ] "Other" is mutually exclusive.
* [ ] Custom amount works correctly.
* [ ] Validation works
