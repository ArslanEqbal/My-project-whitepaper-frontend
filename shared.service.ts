import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SharedService {

  BuName: string = '';
  product: string = '';
  selectedBU: string = '';
  selectedProduct: string = '';
  resourceType: string = '';
  selectedUsecase: string = '';

  constructor() { }

  setBuName(BuName: string) {
    this.BuName = BuName
  }

  getBuName() {
    return this.BuName;
  }

  setProductName(product: string) {
    this.product = product
  }

  getProductName() {
    return this.product;
  }

  setSelectedBuName(selectedBU: string) {
    this.selectedBU = selectedBU
  }

  getSelectedBuName() {
    return this.selectedBU;
  }

  setSelectedProductName(selectedProduct: string) {
    this.selectedProduct = selectedProduct
  }

  getSelectedProductName() {
    return this.selectedProduct;
  }

  setResourceType(resourceType: string) {
    this.resourceType = resourceType
  }

  getResourceType() {
    return this.resourceType
  }

  setSelectedUsecase(selectedUsecase: string) {
    this.selectedUsecase = selectedUsecase
  }

  getSelectedUsecase() {
    return this.selectedUsecase;
  }

  // Updated evaluation status structure
  private evaluationStatus: { [productName: string]: { [useCase: string]: boolean } } = {};
  private evaluationStatusSubject = new BehaviorSubject<{ [productName: string]: { [useCase: string]: boolean } }>(this.evaluationStatus);

  /**
   * Method to update evaluation status for a specific product and use case
   * @param productName - Name of the product
   * @param useCase - Use case (e.g., 'om', 'qa')
   * @param status - Status to set (true or false)
   */
  setEvaluationStatus(productName: string, useCase: string, status: boolean): void {
    // Initialize product's use case object if not present
    if (!this.evaluationStatus[productName]) {
      this.evaluationStatus[productName] = {};
    }

    // Update the specific use case's status
    this.evaluationStatus[productName][useCase] = status;
    this.evaluationStatusSubject.next({ ...this.evaluationStatus }); // Emit updated status
  }

  /**
   * Method to get the evaluation status for a specific product and use case
   * @param productName - Name of the product
   * @param useCase - Use case (e.g., 'om', 'qa')
   * @returns {boolean} - Status of the evaluation (defaults to false if not present)
   */
  getEvaluationStatus(productName: string, useCase: string): boolean {
    return this.evaluationStatus[productName][useCase] || false; // Default to false if not present
  }

  /**
   * Observable to subscribe to evaluation status updates
   * @returns Observable with the current evaluation status
   */
  getEvaluationStatusUpdates() {
    return this.evaluationStatusSubject.asObservable();
  }
  
  evaluatingAppVersion = ''

  setEvaluatingAppVersion(evaluatingAppVersion: string) {
    this.evaluatingAppVersion = evaluatingAppVersion
  }

  getEvaluatingAppVersion() {
    return this.evaluatingAppVersion;
  }




}
