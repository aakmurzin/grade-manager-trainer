# Grade Business Trainer — Addendum 65

Минимальный онбординг: что можно делать, не что выгодно. EN default + RU/UA в messages.

---

## UI

- Экран **NEW SESSION** (company select): блок `OnboardingPanel` перед START
- В сессии: кнопка **?** в HUD → `OnboardingModal` (как arcade `showTutorial`)

Тексты: `messages/{en,ru,ua}.json` → `onboarding.*`  
Компонент: `src/components/OnboardingGuide.tsx`

## Намеренно не включено

Домены/Accountant, формулы осей, тир-советы, пороги — см. addendum body.
