import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'group-overview',
    loadComponent: () =>
      import('./pages/group-overview/group-overview.page').then(
        (m) => m.GroupOverviewPage
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'create-group',
    loadComponent: () =>
      import('./pages/create-group/create-group.page').then(
        (m) => m.CreateGroupPage
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'group',
    loadComponent: () =>
      import('./pages/group/group.page').then((m) => m.GroupPage),
    canActivate: [AuthGuard],
  },
  {
    path: 'group/:groupId',
    loadComponent: () =>
      import('./pages/group/group.page').then((m) => m.GroupPage),
    canActivate: [AuthGuard],
  },
  {
    path: 'finance/:groupId', // groupId wird hier erwartet
    loadComponent: () =>
      import('./pages/finance/finance.page').then((m) => m.FinancePage),
    canActivate: [AuthGuard],
  },
  {
    path: 'expense/:groupId', // groupId wird hier erwartet
    loadComponent: () =>
      import('./pages/expense/expense.page').then((m) => m.ExpensePage),
    canActivate: [AuthGuard],
  },
  {
    path: 'create-expense/:groupId', // groupId wird hier erwartet
    loadComponent: () =>
      import('./pages/create-expense/create-expense.page').then(
        (m) => m.CreateExpensePage
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'expense-details/:groupId',
    loadComponent: () =>
      import('./pages/expense-details/expense-details.page').then(
        (m) => m.ExpenseDetailsPage
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'repeating-expenses/:groupId', // groupId wird hier erwartet
    loadComponent: () =>
      import('./pages/repeating-expenses/repeating-expenses.page').then(
        (m) => m.RepeatingExpensesPage
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'edit-expense/:id',
    loadComponent: () =>
      import('./pages/edit-expense/edit-expense.page').then(
        (m) => m.EditExpensePage
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'edit-group/:id',
    loadComponent: () =>
      import('./pages/edit-group/edit-group.page').then((m) => m.EditGroupPage),
    canActivate: [AuthGuard],
  },
  {
    path: 'join-group',
    loadComponent: () =>
      import('./pages/join-group/join-group.page').then((m) => m.JoinGroupPage),
    canActivate: [AuthGuard],
  },
  {
    path: 'account-settings',
    loadComponent: () =>
      import('./pages/account-settings/account-settings.page').then(
        (m) => m.AccountSettingsPage
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.page').then(
        (m) => m.ResetPasswordPage
      ),
  },
  {
    path: 'not-found',
    loadComponent: () =>
      import('./pages/not-found/not-found.page').then((m) => m.NotFoundPage),
  },
  {
    path: '**',
    redirectTo: 'not-found',
  },
];
