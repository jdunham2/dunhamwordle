# Challenge System Improvements Checklist

## UI/UX Improvements
- [ ] Show popup when playing friend's challenge explaining it's a "Play with Friends" challenge
- [ ] Make header different to show it's a Play with Friends challenge
- [ ] Show instruction message before native share dialog: "You solved [Name]'s challenge. Select how you want to share your solution with them"
- [ ] Change "Play Again" button to "Back" on challenges
- [ ] Add "Send Challenge Back" button on challenge completion

## Challenge Creation
- [ ] Add name field to challenge creation modal
- [ ] Include sender name in challenge URL encoding
- [ ] Display sender name when challenge is received
- [ ] Display sender name in completion message

## Technical Improvements
- [ ] Don't show clipboard alert if device supports native share
- [ ] Pass sender name through challenge creation → URL → display flow

## Badge System
- [ ] Fix badge styling for dark mode
- [ ] Create badge gallery showing all available badges
- [ ] Show earned badges with full opacity + checkmark
- [ ] Show unearned badges grayed out

## Testing
- [ ] Test challenge creation with name
- [ ] Test challenge URL encoding/decoding with name
- [ ] Test challenge completion flow
- [ ] Test native share vs clipboard fallback
- [ ] Test badge gallery display
- [ ] Test dark mode badge styling
