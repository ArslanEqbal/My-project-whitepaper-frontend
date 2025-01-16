import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component';
import { BuScreenComponent } from './dashboard/bu-screen/bu-screen.component';
import { ProductsComponent } from './dashboard/products/products.component';
import { DocumentsComponent } from './dashboard/documents/documents.component';
import { BlueprintComponent } from './dashboard/blueprint/blueprint.component';
import { ChatComponent } from './chatbot/chat/chat.component';
import { OnboardingReportComponent } from './onboarding-report/onboarding-report.component';
import { AuthGuard } from './services/auth.guard';
import { UsageAnalyticsComponent } from './usage-analytics/usage-analytics.component';
import { KpiGlossaryComponent } from './kpi-glossary/kpi-glossary.component';
import { EvaluationTableComponent } from './evaluation-framework/evaluation-table/evaluation-table.component';
import { AddEvaluationComponent } from './evaluation-framework/add-evaluation/add-evaluation.component';
import { EvaluationKpiComponent } from './evaluation-framework/evaluation-kpi/evaluation-kpi.component';


export const routes: Routes = [
  { path: 'login', component: LoginComponent },  //Public unprotected route
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'bu', component: BuScreenComponent, canActivate: [AuthGuard] },
  { path: 'product', component: ProductsComponent, canActivate: [AuthGuard] },
  { path: 'documents', component: DocumentsComponent, canActivate: [AuthGuard] },
  { path: 'blueprint', component: BlueprintComponent, canActivate: [AuthGuard] },
  { path: 'chat', component: ChatComponent, canActivate: [AuthGuard] },
  { path: 'onboarding-report', component: OnboardingReportComponent, canActivate: [AuthGuard] },
  { path: 'usage-analytics', component: UsageAnalyticsComponent, canActivate: [AuthGuard] },
  { path: 'kpi-glossary', component: KpiGlossaryComponent, canActivate: [AuthGuard] },
  { path: 'evaluation-table', component: EvaluationTableComponent, canActivate: [AuthGuard] },
  { path: 'add-evaluation', component: AddEvaluationComponent, canActivate: [AuthGuard] },
  { path: 'evaluation-kpi', component: EvaluationKpiComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '/login' },  // Redirect to login for undefined routes
  { path: '', redirectTo: '/login', pathMatch: 'full' },  // Default to login
];
