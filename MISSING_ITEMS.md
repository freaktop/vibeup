# Missing Items & Improvements Needed

## 🔴 CRITICAL - Data & Profiles

1. **Mock Profiles Missing Kinks**
   - All profiles have `tags` (interests) but no `kinks` field
   - Filters won't work properly for kinks filtering
   - Need to add kinks array to each mock profile

2. **More Mock Profiles Needed**
   - Currently only 8 profiles
   - Need 12-15 profiles for better testing
   - Should have diverse ages, orientations, lookingFor options

## 🟡 IMPORTANT - User Experience

3. **Profile Detail View**
   - When tapping profile in grid → switches to card view (good)
   - But no "View Full Profile" button that shows:
     - All photos in gallery
     - Full bio
     - All interests/kinks
     - Location details
   - Consider adding a dedicated profile detail modal/screen

4. **Loading States**
   - Need loading spinners/indicators when:
     - Loading profiles
     - Saving profile
     - Sending messages
     - Loading map data

5. **Error Handling**
   - Network errors (for future backend integration)
   - Location permission denied
   - File upload errors
   - Storage quota exceeded

## 🟢 NICE TO HAVE - Enhancements

6. **Data Validation**
   - Profile save validation (required fields)
   - Age validation (must be 18+)
   - Photo upload validation (size, format)

7. **Empty States Improvements**
   - Better empty state graphics
   - More helpful CTAs
   - Suggestions on what to do

8. **Search/Filter Enhancements**
   - Search by name/username
   - Filter by verified users only
   - Filter by new profiles
   - Sort by distance, age, recently active

9. **Onboarding Flow**
   - Check if onboarding guides users properly
   - Ensure required steps are completed before accessing app

10. **Testing**
    - Need to test all flows end-to-end
    - Test data persistence (close app, reopen)
    - Test navigation between tabs
    - Test all buttons/actions

11. **Performance**
    - Lazy loading images
    - Virtual scrolling for long lists
    - Image optimization

12. **Accessibility**
    - Screen reader support
    - Keyboard navigation
    - Color contrast checks

## 📋 Checklist for App Store Approval

- [ ] Privacy policy link working
- [ ] Terms of service link working  
- [ ] Age verification (18+)
- [ ] Content moderation/NSFW warnings
- [ ] Report/block functionality tested
- [ ] Location permissions handled gracefully
- [ ] No crashes on empty states
- [ ] All tabs functional
- [ ] Navigation always has exit path
- [ ] Data persistence works correctly
- [ ] Premium features clearly marked
- [ ] No broken links or buttons