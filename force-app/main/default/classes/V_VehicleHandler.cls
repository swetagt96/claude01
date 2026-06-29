/**********************************************************************************************
* @Author:          Shwati Shindhe
* @Date:            22/08/2023
* @Description:     Handler class for trigger VehicleTrigger
* @Story Number:    298144
* @Revision(s):     [Date] - [Change Reference] - [Changed By] - [Description]
25/08/2023 - 297706 - Aman Jha - Calculate and update Model Year
22/02/2024 - 598171 - Yifeng - Add Volvo Vehicle Number to Report: Customer and Vehicle Report
17/02/2025 - 1005858 - Yifeng - SCTASK102839860 Competitor vehicle:  V_TractorRigid__c should not be calculated automatically
02/09/2024 - 1204403 - Sivani - IM Integration Date Stamp on V_IntegrationModifiedDate__c
21/11/2025 - 1254608 - Yifeng - INC109082699 -- refine the Vehicle numbers in the report
26/12/2025 - 1319914 - Yifeng - owing relation number is not correct
22/01/2026 - 1332360 - Sivani - Refactored to handle 101 Error
23/06/2026 - INC110403747 - Guard performAccountClassificationForDelete against unbounded Account
                            SOQL when deleting competitor (Non-Volvo Group) vehicles
**********************************************************************************************/
public without sharing class V_VehicleHandler {
    
    
    private static final String ELIGIBLE_CHARACTERS =  V_Constants.ELIGIBLE_CHARACTERS;
    private static final Integer REPEAT_AFTER = 30;
    
    public static void handleBeforeInsert(List<Vehicle__c> vehicles) {
        for (Vehicle__c vehicle : vehicles) {
            // Modified by Yifeng for Story-1005858 on 2025/02/17 START
            Id volvoRecTypeId = Schema.SObjectType.Vehicle__c.getRecordTypeInfosByDeveloperName().get(V_Constants.VEHICLE_RECORTTYPE_VOLVO_GROUP).getRecordTypeId();
            // if(vehicle.V_CompanyCode__c != null){
            if(vehicle.V_CompanyCode__c != null && vehicle.RecordTypeId == volvoRecTypeId){
            // Modified by Yifeng for Story-1005858 on 2025/02/17 END
                //Yang Requirement Id : 544673 START
                //Change the large company code 'T' to new constant value 'Truck' as V_CompanyCode__c field has changed to picklist
                if (vehicle.V_CompanyCode__c == V_Constants.TRUCK_COMPANYCODE && vehicle.V_MarketingType__c != null && (vehicle.V_MarketingType__c.endsWith(V_Constants.LargeCompanyCode) || vehicle.V_MarketingType__c.endsWith(V_Constants.smallCompanyCode))) {
                    //Yang Requirement Id : 544673 END
                    vehicle.V_TractorRigid__c = V_Constants.Tractor;
                } else {
                    vehicle.V_TractorRigid__c = V_Constants.Rigid;
                }
            }
            // Id volvoRecTypeId = Schema.SObjectType.Vehicle__c.getRecordTypeInfosByDeveloperName().get(V_Constants.VEHICLE_RECORTTYPE_VOLVO_GROUP).getRecordTypeId();
            if(vehicle.RecordTypeId == volvoRecTypeId){
                //Aman Jha Requirement Id: 297706 Calculate and update Model Year START
                if(vehicle.V_ModelYear__c == null && vehicle.V_VIN__c != null) {
                    Date deliveryDate = vehicle.V_DeliveryDate__c != null ? vehicle.V_DeliveryDate__c : Date.today();
                    
                    if (vehicle.V_VIN__c.length() != 17) {
                        RETURN;
                    }
                    
                    String tenthCharacter = vehicle.V_VIN__c.substring(9, 10);
                    if (!ELIGIBLE_CHARACTERS.contains(tenthCharacter)) {
                        RETURN;																																							
                    }
                    
                    Integer currentYear = Date.today().year();
                    Integer cycleStartYear = currentYear - Math.mod(currentYear, REPEAT_AFTER);
                    
                    Integer yearFromVin = cycleStartYear + ELIGIBLE_CHARACTERS.indexOf(tenthCharacter);
                    Integer deliveryYear = deliveryDate.year();
                    
                    if (yearFromVin > deliveryYear) {
                        vehicle.V_ModelYear__c = String.valueOf(deliveryYear);
                    } else {
                        vehicle.V_ModelYear__c = String.valueOf(yearFromVin);
                    }
                }
                //Aman Jha Requirement Id: 297706 Calculate and update Model Year END
            }           
        }
    }
    /**********************************************************************************************
    * @Author:         Yang Wu
    * @Date:           11/01/2024
    * @Description:    Fleet size calculation
    * @Requirement Id: 375688 Fleet size and brand mix auto calculation
    * @Revision(s):    08/08/2024 - 653392 Brand Mix and Fleet size Calculation
    **********************************************************************************************/
    public static void calculateFleetSize(List<Vehicle__c> triggerNew, List<Vehicle__c> triggerOld, map<Id,Vehicle__c> triggerOldmap) {
        Set<Id> accountIdsToUpdate = new Set<Id>();

        // Added by Yifeng for 1319914 on 2025/12/26 START
        Set<Id> owningAccountIdsToUpdate = new Set<Id>();
        // Added by Yifeng for 1319914 on 2025/12/26 END
        
        if (Trigger.isInsert || Trigger.isUndelete) {
            for (Vehicle__c newVehicle : triggerNew) {
                if (newVehicle.V_Usingcustomer__c != null) {
                    accountIdsToUpdate.add(newVehicle.V_Usingcustomer__c);
                }

                // Added by Yifeng for 1319914 on 2025/12/26 START
                if (newVehicle.V_Owner__c != null) {
                    owningAccountIdsToUpdate.add(newVehicle.V_Owner__c);
                }
                // Added by Yifeng for 1319914 on 2025/12/26 END
            }
        }
        if(Trigger.isUpdate){
            for (Vehicle__c newVehicle : triggerNew) {
                if (triggerOldmap.containsKey(newVehicle.Id) && (newVehicle.V_companycode__c != triggerOldmap.get(newVehicle.Id).V_companycode__c || newVehicle.V_Usingcustomer__c != triggerOldmap.get(newVehicle.Id).V_Usingcustomer__c || newVehicle.V_Brand__c != triggerOldmap.get(newVehicle.Id).V_Brand__c || newVehicle.V_Quantity__c != triggerOldmap.get(newVehicle.Id).V_Quantity__c)) {
                    if(newVehicle.V_Usingcustomer__c != null){
                        accountIdsToUpdate.add(newVehicle.V_Usingcustomer__c);
                    }
                    if(triggerOldmap.get(newVehicle.Id).V_Usingcustomer__c != null){
                        accountIdsToUpdate.add(triggerOldmap.get(newVehicle.Id).V_Usingcustomer__c);
                    }
                }

                // Added by Yifeng for 1319914 on 2025/12/26 START
                if (triggerOldmap.containsKey(newVehicle.Id) && (newVehicle.V_companycode__c != triggerOldmap.get(newVehicle.Id).V_companycode__c || newVehicle.V_Owner__c != triggerOldmap.get(newVehicle.Id).V_Owner__c || newVehicle.V_Brand__c != triggerOldmap.get(newVehicle.Id).V_Brand__c || newVehicle.V_Quantity__c != triggerOldmap.get(newVehicle.Id).V_Quantity__c)) {
                    if(newVehicle.V_Owner__c != null){
                        owningAccountIdsToUpdate.add(newVehicle.V_Owner__c);
                    }
                    if(triggerOldmap.get(newVehicle.Id).V_Owner__c != null){
                        owningAccountIdsToUpdate.add(triggerOldmap.get(newVehicle.Id).V_Owner__c);
                    }
                }
                // Added by Yifeng for 1319914 on 2025/12/26 END
            }
        }
        if (Trigger.isDelete) {
            for (Vehicle__c oldVehicle : triggerOld) {
                if (oldVehicle.V_Usingcustomer__c != null) {
                    accountIdsToUpdate.add(oldVehicle.V_Usingcustomer__c);
                }

                // Added by Yifeng for 1319914 on 2025/12/26 START
                if (oldVehicle.V_Owner__c != null) {
                    owningAccountIdsToUpdate.add(oldVehicle.V_Owner__c);
                }
                // Added by Yifeng for 1319914 on 2025/12/26 END
            }
        }
	
	    if (!accountIdsToUpdate.isEmpty()) {
            List<Vehicle__c> relevantVehicles = [SELECT Id, V_Usingcustomer__c, V_CompanyCode__c, V_Brand__c, V_Quantity__c, RecordType.DeveloperName
                                                 FROM Vehicle__c 
                                                 WHERE V_Usingcustomer__c IN :accountIdsToUpdate 
                                                 AND V_CompanyCode__c IN ('Truck', 'Bus')];

            Map<Id, Integer> accountIdToCountMap = new Map<Id, Integer>();
            Map<Id, Integer> accountIdToVolvoCountMap = new Map<Id, Integer>();
            // Vehicle Insight - Total Fleet Size - dual branded VT/RT set-up START
            Map<Id, Integer> accountIdToRenaultCountMap = new Map<Id, Integer>();
            Map<Id, Integer> accountIdToCompetitorCountMap = new Map<Id, Integer>();

            // Vehicle Insight - Total Fleet Size - dual branded VT/RT set-up END
            //964390 - Add a new field to calculate the Mack fleet size on account object START
            Map<Id, Integer> accountIdToMackCountMap = new Map<Id, Integer>();
            //964390 - Add a new field to calculate the Mack fleet size on account object END
            // 970141 Add new field to separate Volvo Truck and Bus fleet size START
            Map<Id, Integer> accountIdToTruckCountMap = new Map<Id, Integer>();
            Map<Id, Integer> accountIdToBusCountMap = new Map<Id, Integer>();
            // 970141 Add new field to separate Volvo Truck and Bus fleet size END

            for (Vehicle__c vehicle : relevantVehicles) {
                Id accountId = vehicle.V_Usingcustomer__c;
                Integer quantity = (vehicle.V_Quantity__c != null) ? Integer.valueOf(vehicle.V_Quantity__c) : 1;

                if (!accountIdToCountMap.containsKey(accountId)) {
                    accountIdToCountMap.put(accountId, 0);
                }
                accountIdToCountMap.put(accountId, accountIdToCountMap.get(accountId) + quantity);

                // Vehicle Insight - Total Fleet Size - dual branded VT/RT set-up START
                if (vehicle.V_Brand__c == V_Constants.BRAND_VOLVO_CODE) {
                    if (!accountIdToVolvoCountMap.containsKey(accountId)) {
                        accountIdToVolvoCountMap.put(accountId, 0);
                    }
                    accountIdToVolvoCountMap.put(accountId, accountIdToVolvoCountMap.get(accountId) + quantity);
                }

                if (vehicle.V_Brand__c == V_Constants.BRAND_RENAULT_CODE) {
                    if (!accountIdToRenaultCountMap.containsKey(accountId)) {
                        accountIdToRenaultCountMap.put(accountId, 0);
                    }
                    accountIdToRenaultCountMap.put(accountId, accountIdToRenaultCountMap.get(accountId) + quantity);
                }

                //964390 - Add a new field to calculate the Mack fleet size on account object START
                if (vehicle.V_Brand__c == V_Constants.BRAND_MACK_CODE) {
                    if (!accountIdToMackCountMap.containsKey(accountId)) {
                        accountIdToMackCountMap.put(accountId, 0);
                    }
                    accountIdToMackCountMap.put(accountId, accountIdToMackCountMap.get(accountId) + quantity);
                }
                //964390 - Add a new field to calculate the Mack fleet size on account object END

                if (vehicle.RecordType.DeveloperName == V_Constants.VEHICLE_RECORTTYPE_NON_VOLVO_GROUP) {
                    if (!accountIdToCompetitorCountMap.containsKey(accountId)) {
                        accountIdToCompetitorCountMap.put(accountId, 0);
                    }
                    accountIdToCompetitorCountMap.put(accountId, accountIdToCompetitorCountMap.get(accountId) + quantity);
                }
                // Vehicle Insight - Total Fleet Size - dual branded VT/RT set-up END
                // 970141 Add new field to separate Volvo Truck and Bus fleet size START
                if (vehicle.V_Brand__c == V_Constants.BRAND_VOLVO_CODE && vehicle.V_companycode__c == V_Constants.TRUCK_COMPANYCODE) {
                    if (!accountIdToTruckCountMap.containsKey(accountId)) {
                        accountIdToTruckCountMap.put(accountId, 0);
                    }
                    accountIdToTruckCountMap.put(accountId, accountIdToTruckCountMap.get(accountId) + quantity);
                }
                if (vehicle.V_Brand__c == V_Constants.BRAND_VOLVO_CODE && vehicle.V_companycode__c == V_Constants.BUS_COMPANYCODE) {
                    if (!accountIdToBusCountMap.containsKey(accountId)) {
                        accountIdToBusCountMap.put(accountId, 0);
                    }
                    accountIdToBusCountMap.put(accountId, accountIdToBusCountMap.get(accountId) + quantity);
                }
                // 970141 Add new field to separate Volvo Truck and Bus fleet size END
            }

            List<Account> accountsToUpdate = new List<Account>();

            for (Id accountId : accountIdsToUpdate) {
                Integer fleetSize = accountIdToCountMap.containsKey(accountId) ? accountIdToCountMap.get(accountId) : 0;
                Integer volvoFleetSize = accountIdToVolvoCountMap.containsKey(accountId) ? accountIdToVolvoCountMap.get(accountId) : 0;
                // Vehicle Insight - Total Fleet Size - dual branded VT/RT set-up START
                //964390 - Add a new field to calculate the Mack fleet size on account object START
                Integer renaultFleetSize = accountIdToRenaultCountMap.containsKey(accountId) ? accountIdToRenaultCountMap.get(accountId) : 0;
                Integer competitorFleetSize = accountIdToCompetitorCountMap.containsKey(accountId) ? accountIdToCompetitorCountMap.get(accountId) : 0;
                Integer mackFleetSize = accountIdToMackCountMap.containsKey(accountId) ? accountIdToMackCountMap.get(accountId) : 0;

                // 970141 Add new field to separate Volvo Truck and Bus fleet size START
                Integer truckFleetSize = accountIdToTruckCountMap.containsKey(accountId) ? accountIdToTruckCountMap.get(accountId) : 0;
                Integer busFleetSize = accountIdToBusCountMap.containsKey(accountId) ? accountIdToBusCountMap.get(accountId) : 0;
                // 970141 Add new field to separate Volvo Truck and Bus fleet size END

                accountsToUpdate.add(new Account(Id = accountId, V_AccountOwnedFleetSize__c = fleetSize, V_AccountOwnedVolvoFleetSize__c = volvoFleetSize, V_AccountOwnedRenaultBrandFleetSize__c = renaultFleetSize, V_AccountOwnedCompetitorFleetSize__c = competitorFleetSize, V_AccountOwnedMackFleetSize__c = mackFleetSize, V_AccountTruckFleetSize__c = truckFleetSize, V_AccountBusFleetSize__c = busFleetSize));
                //964390 - Add a new field to calculate the Mack fleet size on account object END
                // Vehicle Insight - Total Fleet Size - dual branded VT/RT set-up END
            }

            update accountsToUpdate;
        }

        // Added by Yifeng for 1319914 on 2025/12/26 START
        if (!owningAccountIdsToUpdate.isEmpty()) {
            List<Vehicle__c> relevantVehicles = [SELECT Id, V_Owner__c, V_CompanyCode__c, V_Brand__c, V_Quantity__c, RecordType.DeveloperName
                                                 FROM Vehicle__c 
                                                 WHERE V_Owner__c IN :owningAccountIdsToUpdate 
                                                 AND V_CompanyCode__c IN ('Truck', 'Bus')];

            Map<Id, Integer> accountIdToVolvoCountMap = new Map<Id, Integer>();
            Map<Id, Integer> accountIdToRenaultCountMap = new Map<Id, Integer>();
            Map<Id, Integer> accountIdToMackCountMap = new Map<Id, Integer>();

            for (Vehicle__c vehicle : relevantVehicles) {
                Id accountId = vehicle.V_Owner__c;
                Integer quantity = (vehicle.V_Quantity__c != null) ? Integer.valueOf(vehicle.V_Quantity__c) : 1;

                if (vehicle.V_Brand__c == V_Constants.BRAND_VOLVO_CODE) {
                    if (!accountIdToVolvoCountMap.containsKey(accountId)) {
                        accountIdToVolvoCountMap.put(accountId, 0);
                    }
                    accountIdToVolvoCountMap.put(accountId, accountIdToVolvoCountMap.get(accountId) + quantity);
                }

                if (vehicle.V_Brand__c == V_Constants.BRAND_RENAULT_CODE) {
                    if (!accountIdToRenaultCountMap.containsKey(accountId)) {
                        accountIdToRenaultCountMap.put(accountId, 0);
                    }
                    accountIdToRenaultCountMap.put(accountId, accountIdToRenaultCountMap.get(accountId) + quantity);
                }

                if (vehicle.V_Brand__c == V_Constants.BRAND_MACK_CODE) {
                    if (!accountIdToMackCountMap.containsKey(accountId)) {
                        accountIdToMackCountMap.put(accountId, 0);
                    }
                    accountIdToMackCountMap.put(accountId, accountIdToMackCountMap.get(accountId) + quantity);
                }
            }

            List<Account> owningAccountsToUpdate = new List<Account>();

            for (Id accountId : owningAccountIdsToUpdate) {
                Integer volvoFleetSize = accountIdToVolvoCountMap.containsKey(accountId) ? accountIdToVolvoCountMap.get(accountId) : 0;
                Integer renaultFleetSize = accountIdToRenaultCountMap.containsKey(accountId) ? accountIdToRenaultCountMap.get(accountId) : 0;
                Integer mackFleetSize = accountIdToMackCountMap.containsKey(accountId) ? accountIdToMackCountMap.get(accountId) : 0;

                owningAccountsToUpdate.add(new Account(Id = accountId, V_VolvoVehiclesOwningRelation__c = volvoFleetSize, V_RenaultTrucksOwningRelation__c = renaultFleetSize, V_MackTrucksOwningRelation__c = mackFleetSize));
            }

            update owningAccountsToUpdate;
            // Added by Yifeng for 1319914 on 2025/12/26 END
        }
    }
    // Added by Yifeng for Story - 598171 on 2024/02/22 START
    /**********************************************************************************************
    * @Author:         Yifeng
    * @Date:           22/02/2024
    * @Description:    handleAfterInsert
    * @Requirement Id: 598171 Add Volvo Vehicle Number to Report: Customer and Vehicle Report
    * @Revision(s):    [Date] - [Change Reference] - [Changed By] - [Description]
    **********************************************************************************************/
    public static void handleAfterInsert(List<Vehicle__c> newVehicles) {
        try {
            calculateVolvoVehicles(newVehicles);
        } catch (Exception ex) {
            System.debug(LoggingLevel.ERROR, 'An error occurred: ' + ex.getMessage());
            V_Error_Log.log('V_VehicleHandler.handleAfterInsert', ex);
        }
    }
    
    /**********************************************************************************************
    * @Author:         Yifeng
    * @Date:           22/02/2024
    * @Description:    handleAfterUpdate
    * @Requirement Id: 598171 Add Volvo Vehicle Number to Report: Customer and Vehicle Report
    * @Revision(s):    [Date] - [Change Reference] - [Changed By] - [Description]
    **********************************************************************************************/
    public static void handleAfterUpdate(map<Id,Vehicle__c> mapVehicleNew, map<Id,Vehicle__c> mapVehicleOld) {
        try {
            List<Vehicle__c> lstVehicle = new List<Vehicle__c>();
            for(Vehicle__c vehicle :mapVehicleNew.values()) {
                if(mapVehicleOld.get(vehicle.Id).V_Owner__c != vehicle.V_Owner__c
                   || mapVehicleOld.get(vehicle.Id).V_Usingcustomer__c != vehicle.V_Usingcustomer__c) {
                       lstVehicle.add(vehicle);
                       lstVehicle.add(mapVehicleOld.get(vehicle.Id));
                   } else if(mapVehicleOld.get(vehicle.Id).V_Quantity__c != vehicle.V_Quantity__c
                             || mapVehicleOld.get(vehicle.Id).V_Brand__c != vehicle.V_Brand__c
                             || mapVehicleOld.get(vehicle.Id).RecordType.DeveloperName != vehicle.RecordType.DeveloperName) {
                                 lstVehicle.add(vehicle);
                             }
            }
            if(!lstVehicle.isEmpty()) {
                calculateVolvoVehicles(lstVehicle);
            }
        } catch (Exception ex) {
            System.debug(LoggingLevel.ERROR, 'An error occurred: ' + ex.getMessage());
            V_Error_Log.log('V_VehicleHandler.handleAfterUpdate', ex);
        }
    }
    
    /**********************************************************************************************
    * @Author:         Yifeng
    * @Date:           22/02/2024
    * @Description:    handleAfterDelete
    * @Requirement Id: 598171 Add Volvo Vehicle Number to Report: Customer and Vehicle Report
    * @Revision(s):    [Date] - [Change Reference] - [Changed By] - [Description]
    **********************************************************************************************/
    public static void handleAfterDelete(List<Vehicle__c> oldVehicles) {
        try {
            calculateVolvoVehicles(oldVehicles);
        } catch (Exception ex) {
            System.debug(LoggingLevel.ERROR, 'An error occurred: ' + ex.getMessage());
            V_Error_Log.log('V_VehicleHandler.handleAfterDelete', ex);
        }
    }
    
    /**********************************************************************************************
    * @Author:         Yifeng
    * @Date:           22/02/2024
    * @Description:    Vovlo Vehicles calculation
    * @Requirement Id: 598171 Add Volvo Vehicle Number to Report: Customer and Vehicle Report
    * @Revision(s):    [Date] - [Change Reference] - [Changed By] - [Description]
    **********************************************************************************************/
    public static void calculateVolvoVehicles(List<Vehicle__c> lstVehicle) {
        try {
            
            set<Id> setAccountId = new set<Id>();
            set<Id> setVolvoAccountId = new set<Id>();
            set<Id> setRenaultAccountId = new set<Id>();
            
            for(Vehicle__c vehicle : lstVehicle) {
                if(vehicle.V_Brand__c == V_Constants.BRAND_VOLVO_CODE) {
                    if(vehicle.V_Owner__c != null) {
                        setVolvoAccountId.add(vehicle.V_Owner__c);
                    }
                    if(vehicle.V_Usingcustomer__c != null) {
                        setVolvoAccountId.add(vehicle.V_Usingcustomer__c);
                    }
                } else if(vehicle.V_Brand__c == V_Constants.BRAND_RENAULT_CODE) {
                    if(vehicle.V_Owner__c != null) {
                        setRenaultAccountId.add(vehicle.V_Owner__c);
                    }
                    if(vehicle.V_Usingcustomer__c != null) {
                        setRenaultAccountId.add(vehicle.V_Usingcustomer__c);
                    }
                }
            }
            
            // Volvo
            if(!setVolvoAccountId.isEmpty()) {
                updateVolvoVehicles(setVolvoAccountId, 'Volvo');
            }
            
            // Renault
            if(!setRenaultAccountId.isEmpty()) {
                updateVolvoVehicles(setRenaultAccountId, 'Renault');
            }
            
            for(Vehicle__c vehicle : lstVehicle) {           
                if(vehicle.V_Owner__c != null) {
                    setAccountId.add(vehicle.V_Owner__c);
                }
                if(vehicle.V_Usingcustomer__c != null) {
                    setAccountId.add(vehicle.V_Usingcustomer__c);
                }
            }
            
            // All
            if(!setAccountId.isEmpty()) {
                updateVolvoVehicles(setAccountId, 'All');
            }
        } catch (Exception ex) {
            System.debug(LoggingLevel.ERROR, 'An error occurred: ' + ex.getMessage());
            V_Error_Log.log('V_VehicleHandler.updateVolvoVehicles', ex);
        }
    }
    
    public static void updateVolvoVehicles(Set<Id> setAccountId, String strBrand) {
        String strVolvoGroup = V_Constants.VEHICLE_RECORTTYPE_VOLVO_GROUP;
        String strVolvoCode = V_Constants.BRAND_VOLVO_CODE;
        String strRenaultCode = V_Constants.BRAND_RENAULT_CODE;
        
        Map<Id, Account> updateAccountMap = new Map<Id, Account>();

        // Added by Yifeng for 1254608 on 2025/11/21 START
        List<String> companyCodeList = new List<String>{V_Constants.BUS_COMPANYCODE, V_Constants.TRUCK_COMPANYCODE};
        // Added by Yifeng for 1254608 on 2025/11/21 END
        
        if(!setAccountId.isEmpty()) {
            List<Account> lstAccountNew = new List<Account>();
            // Modified by Yifeng for 1254608 on 2025/11/21 START
            /*if(strBrand == 'Volvo') {
                lstAccountNew = [select id, V_MainAccount__c, V_NumberOfVolvoVehicles__c 
                                 from Account 
                                 where (id in :setAccountId or V_MainAccount__c in :setAccountId)
                                 and V_LocalAccountCDBPartyID__c != null 
                                 and V_MainAccount__c != null
                                 and V_AccountBrand__c like '%Volvo%'];
            } else if(strBrand == 'Renault') {
                lstAccountNew = [select id, V_MainAccount__c, V_NumberOfVolvoVehicles__c 
                                 from Account 
                                 where (id in :setAccountId or V_MainAccount__c in :setAccountId)
                                 and V_LocalAccountCDBPartyID__c != null 
                                 and V_MainAccount__c != null
                                 and V_AccountBrand__c like '%Renault%'];
            } else if(strBrand == 'All') {*/
            lstAccountNew = [select id, V_MainAccount__c, V_NumberOfVolvoVehicles__c 
                             from Account 
                             where (id in :setAccountId or V_MainAccount__c in :setAccountId)
                             and V_LocalAccountCDBPartyID__c != null 
                             and V_MainAccount__c != null];
            // }
            // Modified by Yifeng for 1254608 on 2025/11/21 END
            
            Set<Id> accountIdSet = new Set<Id>();
            Set<Id> mainAccountIdSet = new Set<Id>();
            
            for(Account acc : lstAccountNew) {
                accountIdSet.add(acc.Id);
                mainAccountIdSet.add(acc.V_MainAccount__c);
            }
            
            String strVehicleQuery = 'select id,V_Owner__c, V_Usingcustomer__c, RecordType.DeveloperName,V_Brand__c,V_Quantity__c ';
            strVehicleQuery += 'from Vehicle__c ';
            strVehicleQuery += 'where (V_Owner__c in :accountIdSet or V_Owner__c in :mainAccountIdSet or V_Usingcustomer__c in :accountIdSet or V_Usingcustomer__c in :mainAccountIdSet) ';
            strVehicleQuery += 'and RecordType.DeveloperName = :strVolvoGroup ';
            // Added by Yifeng for 1254608 on 2025/11/21 START
            strVehicleQuery += 'and V_CompanyCode__c in :companyCodeList ';
            // Added by Yifeng for 1254608 on 2025/11/21 END
            if(strBrand == 'Volvo') {
                strVehicleQuery += 'and V_Brand__c = :strVolvoCode';
            } else if(strBrand == 'Renault') {
                strVehicleQuery += 'and V_Brand__c = :strRenaultCode';
            }
            System.debug(LoggingLevel.INFO, '*** strVehicleQuery: ' + strVehicleQuery);
            
            List<Vehicle__c> vehicleList = Database.query(strVehicleQuery);
            
            if(vehicleList != null && vehicleList.size() > 0) {
                System.debug(LoggingLevel.INFO, '*** vehicleList.size(): ' + vehicleList.size());
                if(strBrand == 'Volvo') {
                    for(Account acc : lstAccountNew) {
                        acc.V_NumberOfVolvoVehicles__c = 0;
                    }
                    
                    for(Account acc : lstAccountNew) {
                        Boolean hasVehicle = false;
                        for(Vehicle__c vehicle : vehicleList) {
                            Integer intVolvoVehicle = vehicle.V_Quantity__c != null ? Integer.valueOf(vehicle.V_Quantity__c) : 1;
                            if(vehicle.V_Owner__c == acc.Id || vehicle.V_Owner__c == acc.V_MainAccount__c || vehicle.V_Usingcustomer__c == acc.Id || vehicle.V_Usingcustomer__c == acc.V_MainAccount__c) {
                                acc.V_NumberOfVolvoVehicles__c += intVolvoVehicle;
                                hasVehicle = true;
                            }
                        }
                        if(!hasVehicle) {
                            acc.V_NumberOfVolvoVehicles__c = null;
                        }
                        updateAccountMap.put(acc.Id, acc);
                    }
                } else if(strBrand == 'Renault') {
                    for(Account acc : lstAccountNew) {
                        acc.V_NumberOfRenaultVehicles__c = 0;
                    }
                    
                    for(Account acc : lstAccountNew) {
                        Boolean hasVehicle = false;
                        for(Vehicle__c vehicle : vehicleList) {
                            Integer intRenaultVehicle = vehicle.V_Quantity__c != null ? Integer.valueOf(vehicle.V_Quantity__c) : 1;
                            if(vehicle.V_Owner__c == acc.Id || vehicle.V_Owner__c == acc.V_MainAccount__c || vehicle.V_Usingcustomer__c == acc.Id || vehicle.V_Usingcustomer__c == acc.V_MainAccount__c) {
                                acc.V_NumberOfRenaultVehicles__c += intRenaultVehicle;
                                hasVehicle = true;
                            }
                        }
                        if(!hasVehicle) {
                            acc.V_NumberOfRenaultVehicles__c = null;
                        }
                        updateAccountMap.put(acc.Id, acc);
                    }
                } else if(strBrand == 'All') {
                    for(Account acc : lstAccountNew) {
                        acc.V_NumberOfVolvoGroupVehicles__c = 0;
                    }
                    
                    for(Account acc : lstAccountNew) {
                        Boolean hasVehicle = false;
                        for(Vehicle__c vehicle : vehicleList) {
                            Integer intVehicle = vehicle.V_Quantity__c != null ? Integer.valueOf(vehicle.V_Quantity__c) : 1;
                            if(vehicle.V_Owner__c == acc.Id || vehicle.V_Owner__c == acc.V_MainAccount__c || vehicle.V_Usingcustomer__c == acc.Id || vehicle.V_Usingcustomer__c == acc.V_MainAccount__c) {
                                acc.V_NumberOfVolvoGroupVehicles__c += intVehicle;
                                hasVehicle = true;
                            }
                        }
                        if(!hasVehicle) {
                            acc.V_NumberOfVolvoGroupVehicles__c = null;
                        }
                        updateAccountMap.put(acc.Id, acc);
                    }
                }
            }
            
            List<Account> needUpdateAccountList = new List<Account>();
            Map<Id, Account> updateVolvoVehicleNullAccountMap = new Map<Id, Account>();
            
            if(updateAccountMap.size() > 0) {
                needUpdateAccountList.addAll(updateAccountMap.values());
            } else {
                List<Account> lstAccountVolvoVehicleNull = new List<Account>();
                // Modified by Yifeng for 1254608 on 2025/11/21 START
                /*if(strBrand == 'Volvo') {
                    lstAccountVolvoVehicleNull = [select id, V_MainAccount__c, V_NumberOfVolvoVehicles__c 
                                                  from Account 
                                                  where (id in :setAccountId or V_MainAccount__c in :setAccountId)
                                                  and V_LocalAccountCDBPartyID__c != null 
                                                  and V_MainAccount__c != null
                                                  and V_AccountBrand__c like '%Volvo%'];
                    
                    if(lstAccountVolvoVehicleNull.size() > 0) {
                        for(Account accVolvoVehicleNull : lstAccountVolvoVehicleNull) {
                            accVolvoVehicleNull.V_NumberOfVolvoVehicles__c = null;
                            updateVolvoVehicleNullAccountMap.put(accVolvoVehicleNull.Id, accVolvoVehicleNull);
                        }
                    }
                } else if(strBrand == 'Renault') {
                    lstAccountVolvoVehicleNull = [select id, V_MainAccount__c, V_NumberOfVolvoVehicles__c 
                                                  from Account 
                                                  where (id in :setAccountId or V_MainAccount__c in :setAccountId)
                                                  and V_LocalAccountCDBPartyID__c != null 
                                                  and V_MainAccount__c != null
                                                  and V_AccountBrand__c like '%Renault%'];
                    if(lstAccountVolvoVehicleNull.size() > 0) {
                        for(Account accVolvoVehicleNull : lstAccountVolvoVehicleNull) {
                            accVolvoVehicleNull.V_NumberOfRenaultVehicles__c = null;
                            updateVolvoVehicleNullAccountMap.put(accVolvoVehicleNull.Id, accVolvoVehicleNull);
                        }
                    }
                } else if(strBrand == 'All') {*/
                lstAccountVolvoVehicleNull = [select id, V_MainAccount__c, V_NumberOfVolvoVehicles__c, V_NumberOfRenaultVehicles__c, V_NumberOfVolvoGroupVehicles__c
                                              from Account 
                                              where (id in :setAccountId or V_MainAccount__c in :setAccountId)
                                              and V_LocalAccountCDBPartyID__c != null 
                                              and V_MainAccount__c != null];
                if(lstAccountVolvoVehicleNull.size() > 0) {
                    for(Account accVolvoVehicleNull : lstAccountVolvoVehicleNull) {
                        accVolvoVehicleNull.V_NumberOfVolvoVehicles__c = null;
                        accVolvoVehicleNull.V_NumberOfRenaultVehicles__c = null;
                        accVolvoVehicleNull.V_NumberOfVolvoGroupVehicles__c = null;
                        updateVolvoVehicleNullAccountMap.put(accVolvoVehicleNull.Id, accVolvoVehicleNull);
                    }
                }
                // }
                // Modified by Yifeng for 1254608 on 2025/11/21 END
                
                if(updateVolvoVehicleNullAccountMap.size() > 0) {
                    needUpdateAccountList.addAll(updateVolvoVehicleNullAccountMap.values());
                }
            }
            
            System.debug(LoggingLevel.INFO, '*** needUpdateAccountList.size(): ' + needUpdateAccountList.size());
            if(needUpdateAccountList.size() > 0) {
                Database.SaveResult[] saveResults = Database.update(needUpdateAccountList);
                for(Database.SaveResult sr : saveResults) {
                    if(!sr.isSuccess()) {
                        for(Database.Error e : sr.getErrors()) {
                            System.debug(LoggingLevel.INFO, '*** e.getMessage(): ' + e.getMessage());
                        }
                    }
                }
            }
        }
    }
    // Added by Yifeng for Story - 598171 on 2024/02/22 END

    /**********************************************************************************************
    * @Author:         Subramanya Chitrapadi
    * @Date:           04/10/2024
    * @Description:    Business logic to update the Account type to either Prospect or Customer for the related Vehicles
    * @Requirement Id: 367911 Automation of Account Classification
    * @Revision(s):    [Date] - [Change Reference] - [Changed By] - [Description]
    **********************************************************************************************/
    public static void performAccountClassificationInBatch(List<Vehicle__c> newVehicles, Map<Id, Vehicle__c> oldVehicles) {


        Set<Id> ownerAndUsingCustomerIds = new Set<Id>();
        Set<Id> sellingMgmtIds = new Set<Id>();
        List<Vehicle__c> volvoVehicles = new List<Vehicle__c>();

        //Id volvoGroupRecordTypeId = getVolvoGroupRecordTypeId(); Refactored as part of BUG 1332360
        Id volvoGroupRecordTypeId = Schema.SObjectType.Vehicle__c.getRecordTypeInfosByDeveloperName().get(V_Constants.VEHICLE_RECORTTYPE_VOLVO_GROUP).getRecordTypeId();

        for (Vehicle__c vehicle : newVehicles) {

            if(vehicle.RecordTypeId == volvoGroupRecordTypeId){


                if (vehicle.V_SellingManagementGroup__c != null) {
                    sellingMgmtIds.add(vehicle.V_SellingManagementGroup__c);
                }
                if (vehicle.V_Usingcustomer__c != null) {
                    ownerAndUsingCustomerIds.add(vehicle.V_Usingcustomer__c);
    
                }
                if (vehicle.V_Owner__c != null) {
                    ownerAndUsingCustomerIds.add(vehicle.V_Owner__c);
                }
                volvoVehicles.add(vehicle);
            }
        }

        if (!ownerAndUsingCustomerIds.isEmpty() && !sellingMgmtIds.isEmpty() && Limits.getAsyncCalls() < Limits.getLimitAsyncCalls()) {
            try {
                V_AccountClassificationFromVehicleBatch vehicleBatch = new V_AccountClassificationFromVehicleBatch(ownerAndUsingCustomerIds, sellingMgmtIds, volvoVehicles);
                Database.executeBatch(vehicleBatch, 200);
            } catch (System.AsyncException e) {
                V_Error_Log.log('V_VehicleHandler.performAccountClassificationInBatch', e);
            }
        }
    }

    /**********************************************************************************************
    * @Author:         Subramanya Chitrapadi
    * @Date:           10/11/2024
    * @Description:    update the Account type to Customer for the vehicles getting removed from VDA, for next 10 years
    * @Requirement Id: 367911 Automation of Account Classification
    * @Revision(s):    [Date] - [Change Reference] - [Changed By] - [Description]
    *                  23/06/2026 - BUG INC110403747 - Added early return guard so competitor
    *                               (Non-Volvo Group) vehicle deletes no longer run an unbounded
    *                               Account SOQL that threw "Too many query rows: 50001".
    **********************************************************************************************/
    public static void performAccountClassificationForDelete(List<Vehicle__c> oldVehicles, List<Vehicle__c> nullVehicles) {


        Set<Id> mainAccountIds = new Set<Id>();
        Set<Id> managementAccountIds = new Set<Id>();
		
        Map<Id, Account> localAccountToUpdate = new Map<Id, Account>();     
        Map<Id, List<Date>> accountVehiclesMapDate = new Map<Id, List<Date>>();
        map<string,List<Date>> mapVehicleDate = new Map<string,List<Date>>();

        //Id volvoGroupRecordTypeId = getVolvoGroupRecordTypeId(); Refactored as part of BUG 1332360
        
        Id volvoGroupRecordTypeId = Schema.SObjectType.Vehicle__c.getRecordTypeInfosByDeveloperName().get(V_Constants.VEHICLE_RECORTTYPE_VOLVO_GROUP).getRecordTypeId();

        for (Vehicle__c vehicle : oldVehicles) {

            if(vehicle.RecordTypeId == volvoGroupRecordTypeId){

                if (vehicle.V_SellingManagementGroup__c != null) {
                    managementAccountIds.add(vehicle.V_SellingManagementGroup__c);
                }
                if (vehicle.V_Usingcustomer__c != null) {
                    mainAccountIds.add(vehicle.V_Usingcustomer__c);
    
                }
                if (vehicle.V_Owner__c != null) {
                    mainAccountIds.add(vehicle.V_Owner__c);
                }
            }
        }

        // BUG INC110403747 fix START
        // Account classification on delete applies only to Volvo Group vehicles.
        // For competitor (Non-Volvo Group) vehicles, both sets stay empty, which made the
        // Account SOQL below run UNBOUNDED (SELECT ... FROM Account WHERE RecordTypeId = '...')
        // and throw System.LimitException: Too many query rows: 50001, blocking the delete.
        // The only DML in this method is already gated on both sets being non-empty, so exiting
        // early here changes no behavior for Volvo Group vehicles.
        if (mainAccountIds.isEmpty() || managementAccountIds.isEmpty()) {
            return;
        }
        // BUG INC110403747 fix END

		String query = 'SELECT Id, V_MainAccount__c, V_ManagmentGroupAccount__c, V_LocalAccountCDBPartyID__c, ' +
                       'V_AccountBrand__c, V_LASTAMINVDATE__c, V_LASTPARTINVDATE__c, V_LASTWSINVDATE__c, V_LatestClassificationDate__c ' +
                       'FROM Account WHERE RecordTypeId = \'' + V_Constants.LOCAL_ACCOUNT_RECORD_TYPE_ID + '\' ';
    
        if (!mainAccountIds.isEmpty() && !managementAccountIds.isEmpty()) {
            
            String owningAndUsingCustIdsStr = '\'' + String.join(new List<Id>(mainAccountIds), '\', \'') + '\'';
            String sellingManagementGroupIdsStr = '\'' + String.join(new List<Id>(managementAccountIds), '\', \'') + '\'';
            query += 'AND V_MainAccount__c IN (' + owningAndUsingCustIdsStr + ') ';
            query += 'AND V_ManagmentGroupAccount__c IN (' + sellingManagementGroupIdsStr + ') ';
		}
		
		List<Account> localAccounts = Database.query(query);
		
		List<Vehicle__c> remainingVehicles = new List<Vehicle__c>();
	
		if (mainAccountIds != null && !mainAccountIds.isEmpty() && managementAccountIds != null && !managementAccountIds.isEmpty()) {
			
			// Collect IDs of deleted vehicles
			Map<Id, Vehicle__c> deletedVehicleMap = new Map<Id, Vehicle__c>();
			for (Vehicle__c v : oldVehicles) {
				deletedVehicleMap.put(v.Id, v);
			}
			Set<Id> deletedVehicleIds = deletedVehicleMap.keySet();

            for (Vehicle__c v : [SELECT Id, V_DeliveryDate__c, V_UsingCustomer__c, V_Owner__c, V_SellingManagementGroup__c, toLabel(V_Brand__c) 
                                 FROM Vehicle__c 
                                 WHERE (V_UsingCustomer__c IN :mainAccountIds OR V_Owner__c IN :mainAccountIds) 
                                 AND V_SellingManagementGroup__c IN :managementAccountIds
                                 //AND toLabel(V_Brand__c) = :V_Constants.VOLVO_BRAND 
                                 AND V_DeliveryDate__c != NULL
                                 AND RecordType.DeveloperName = :V_Constants.VEHICLE_RECORTTYPE_VOLVO_GROUP
								 AND Id NOT IN :deletedVehicleIds]) 
                {
                    String Brand = '';

                    if(String.IsNotBlank(v.V_Brand__c)){
                        if(v.V_Brand__c == V_Constants.VOLVO_BRAND || v.V_Brand__c == V_Constants.MACK_BRAND){
                            Brand = V_Constants.VOLVO_BRAND;
                        }
                        else{
                            Brand = v.V_Brand__c;
                        }
                    }         
                
                    String Key1;
                    String Key2;

                    if (v.V_UsingCustomer__c != null) {
                        Key1 = v.V_UsingCustomer__c + ':' + v.V_SellingManagementGroup__c + ':' + Brand;
                    }

                    if (v.V_Owner__c != null) {
                        Key2 = v.V_Owner__c + ':' + v.V_SellingManagementGroup__c + ':' + Brand;
                    }

                    if (Key1 != null && String.isNotBlank(Key1)) {
                        List<Date> lstVehicleKey11 = mapVehicleDate.get(Key1);
                        if (lstVehicleKey11 == null) {
                            lstVehicleKey11 = new List<Date>();
                        }
                        lstVehicleKey11.add(v.V_DeliveryDate__c);
                        mapVehicleDate.put(Key1, lstVehicleKey11);
                    }

                    if (Key2 != null && String.isNotBlank(Key2)) {
                        List<Date> lstVehicleKey22 = mapVehicleDate.get(Key2);
                        if (lstVehicleKey22 == null) {
                            lstVehicleKey22 = new List<Date>();
                        }
                        lstVehicleKey22.add(v.V_DeliveryDate__c);
                        mapVehicleDate.put(Key2, lstVehicleKey22);
                    }
                }
                List<Account> lstAccountToBeUpdated = new List<Account>();
                for(Account ac : localAccounts){
                    
                    if(ac.V_MainAccount__c != null && ac.V_ManagmentGroupAccount__c != null){
                        
                        String Brand = '';
                        
                        if(String.IsNotBlank(ac.V_AccountBrand__c)){
                            
                            Brand = ac.V_AccountBrand__c;
                            if(Brand == V_Constants.VOLVO_TRUCKS_BABRAND_NAME){
                                Brand = V_Constants.VOLVO_BRAND;
                            }else if(Brand == V_Constants.RENAULT_TRUCKS_BABRAND_NAME){
                                Brand = V_Constants.RENAULT_BRAND;
                            }                        
                        }

                        String Key = '';
                        List<Date> lstVehicle = new List<Date>();
                        
                        if(String.IsBlank(Brand)){
                            Brand = V_Constants.VOLVO_BRAND;
                            Key = ac.V_MainAccount__c + ':' + ac.V_ManagmentGroupAccount__c + ':'+Brand;
                            lstVehicle = mapVehicleDate.get(Key);
                        }
                        else{
                            Key = ac.V_MainAccount__c + ':' + ac.V_ManagmentGroupAccount__c + ':' + Brand;
                            lstVehicle = mapVehicleDate.get(Key);
                        }

                        List<Date> lstDeliveryDate = new List<Date>();
						
						Date highestDeliveryDate = null;
                        if (lstVehicle != null && !lstVehicle.isEmpty()) {
                            
                            lstVehicle.sort();
							highestDeliveryDate = lstVehicle[lstVehicle.size() - 1]; 
                        }

						Date latestClassificationDate = V_AccountTriggerHelper.getClassificationDateIfCustomer(ac, highestDeliveryDate);
                        

                        Date tenYearsAgo = Date.today().addYears(-10);

                        Account accountToUpdate = new Account(Id = ac.Id); // Use existing Id for update
						Boolean isCustomer = (latestClassificationDate != null && latestClassificationDate >= tenYearsAgo);
                        if (isCustomer) {
                            accountToUpdate.Type = V_Constants.ACCOUNT_TYPE_CUSTOMER;
                            accountToUpdate.V_LatestClassificationDate__c = latestClassificationDate;
                        } else {
                            accountToUpdate.Type = V_Constants.ACCOUNT_TYPE_PROSPECT;
                            accountToUpdate.V_LatestClassificationDate__c = null; 
                        }
                        
						lstAccountToBeUpdated.add(accountToUpdate);						
                    } 
                }
                    
                if(!lstAccountToBeUpdated.isEmpty())
                {
                    try {
						update lstAccountToBeUpdated;
					} catch (DmlException e) {
						System.debug('Error performing update on accounts: ' + e.getMessage());
						V_Error_Log.log('V_AccountClassificationFromVehicleBatch.performAccountClassificationForDelete', e);
					}
				}
        }
    }


    /* commented as part of BUG 1332360
     * public static Id getVolvoGroupRecordTypeId() {
        return [SELECT Id FROM RecordType WHERE DeveloperName = 'VolvoGroup' AND SObjectType = 'Vehicle__c' LIMIT 1].Id;
    }*/

    /**********************************************************************************************
    * @Author:         Sivani
    * @Date:           28/08/2025
    * @Description:    1204403 - New field on the Account object: V_IntegrationModifiedDate__c
    **********************************************************************************************/
    public static void updateAccountIntegrationDate(List<Vehicle__c> vehicles, Map<Id, Vehicle__c> oldMap, Boolean isInsert) {
        
        if (vehicles == null || vehicles.isEmpty()) return;
        
        Set<Id> vehicleIds = new Set<Id>();
        for (Vehicle__c v : vehicles) {
            vehicleIds.add(v.Id);
        }
        
        vehicles = [
            SELECT Id, RecordTypeId, RecordType.DeveloperName,
            V_Brand__c, V_DeliveryDate__c, V_FirstRegistrationDate__c, V_Quantity__c,
            V_UsingCustomer__c,
            V_UsingCustomer__r.V_CDBPartyID__c,
            V_UsingCustomer__r.V_LocalAccountCDBPartyID__c,
            V_SellingManagementGroup__c,
            V_SellingManagementGroup__r.V_ManagmentCDBPartyId__c
            FROM Vehicle__c
            WHERE Id IN :vehicleIds
        ];
        
        Set<String> customerCDBIds = new Set<String>();
        Set<String> managementCDBIds = new Set<String>();
        Map<String, Boolean> vehicleKeyMap = new Map<String, Boolean>();
        
        Id volvoRecTypeId = Schema.SObjectType.Vehicle__c
            .getRecordTypeInfosByDeveloperName()
            .get(V_Constants.VEHICLE_RECORTTYPE_VOLVO_GROUP)
            .getRecordTypeId();
        
        Id nonVolvoRecTypeId = Schema.SObjectType.Vehicle__c
            .getRecordTypeInfosByDeveloperName()
            .get(V_Constants.VEHICLE_RECORTTYPE_NON_VOLVO_GROUP)
            .getRecordTypeId();

        for (Vehicle__c v : vehicles) {
            Vehicle__c oldV = oldMap != null ? oldMap.get(v.Id) : null;

            Boolean isVolvoGroupDelivery =
                (isInsert && v.RecordTypeId == volvoRecTypeId) ||
                (v.RecordTypeId == volvoRecTypeId &&v.V_Brand__c == V_Constants.BRAND_VOLVO_CODE &&
                 oldV != null && v.V_DeliveryDate__c != oldV.V_DeliveryDate__c);
            
            if (isVolvoGroupDelivery) {
                if (v.V_UsingCustomer__r != null && v.V_UsingCustomer__r.V_CDBPartyID__c != null &&
                    v.V_SellingManagementGroup__r != null && v.V_SellingManagementGroup__r.V_ManagmentCDBPartyId__c != null) {

                        String customerCDB = v.V_UsingCustomer__r.V_CDBPartyID__c;
                        String managementCDB = v.V_SellingManagementGroup__r.V_ManagmentCDBPartyId__c;

                    customerCDBIds.add(customerCDB);
                    managementCDBIds.add(managementCDB);
                    vehicleKeyMap.put(customerCDB + '::' + managementCDB, true);
            }            
        }

            Boolean isNonVolvoChange =
                (isInsert && v.RecordTypeId == nonVolvoRecTypeId) ||
                (v.RecordTypeId == nonVolvoRecTypeId && oldV != null && v.V_FirstRegistrationDate__c != oldV.V_FirstRegistrationDate__c);
            
            if (isNonVolvoChange) {
                if (v.V_UsingCustomer__r != null &&
                    (v.V_UsingCustomer__r.V_CDBPartyID__c != null ||
                     v.V_UsingCustomer__r.V_LocalAccountCDBPartyID__c != null)) {
                         
                         String customerCDB = v.V_UsingCustomer__r.V_CDBPartyID__c != null
                             ? v.V_UsingCustomer__r.V_CDBPartyID__c
                             : v.V_UsingCustomer__r.V_LocalAccountCDBPartyID__c;
                         
                         customerCDBIds.add(customerCDB);
                     }
            }
        }
        
        if (!customerCDBIds.isEmpty()) {
            List<Account> accountsToUpdate;
            
            if (!managementCDBIds.isEmpty()) {
                accountsToUpdate = [
            SELECT Id, V_LocalAccountCDBPartyID__c, V_ManagmentGroupAccount__r.V_ManagmentCDBPartyId__c
            FROM Account
            WHERE V_LocalAccountCDBPartyID__c IN :customerCDBIds
            AND V_ManagmentGroupAccount__r.V_ManagmentCDBPartyId__c IN :managementCDBIds
        ];

                for (Account acc : accountsToUpdate) {
                    String key = acc.V_LocalAccountCDBPartyID__c + '::' +
                        acc.V_ManagmentGroupAccount__r.V_ManagmentCDBPartyId__c;
                    if (vehicleKeyMap.containsKey(key)) {
                acc.V_IntegrationModifiedDate__c = System.now();
            }
        }
            } else {
                accountsToUpdate = [
                    SELECT Id, V_LocalAccountCDBPartyID__c, V_CDBPartyID__c
                    FROM Account
                    WHERE V_LocalAccountCDBPartyID__c IN :customerCDBIds
                    OR V_CDBPartyID__c IN :customerCDBIds
                ];
                
                for (Account acc : accountsToUpdate) {
                    acc.V_IntegrationModifiedDate__c = System.now();
                }
            }

            if (!accountsToUpdate.isEmpty()) {
            try {
                    Database.update(accountsToUpdate, false);
            } catch (DmlException e) {
                    V_Error_Log.log('V_VehicleHandler.updateAccountIntegrationDate', e);
                }
            }
        }
    }
    
    /**********************************************************************************************
    * @Author:         Sivani
    * @Date:           01/09/2025
    * @Description:    1204403 - New field on the Account to update competitor vehicle value
                       1298903 - V_MainCompetitorBrand__c is null when competitor vehicles are added via imports in main account
    **********************************************************************************************/
    
    public static void updateAccountCompetitorBrands(List<Vehicle__c> newVehicles, Map<Id, Vehicle__c> oldMap, Boolean isInsert, Boolean isUpdate) {
                
        if(newVehicles == null || newVehicles.isEmpty()) return;
        
        // Step 1: Filter only Non-Volvo Group records
        List<Vehicle__c> relevantVehicles = new List<Vehicle__c>();
        for(Vehicle__c v : newVehicles) {
            if(v.RecordType.DeveloperName == V_Constants.VEHICLE_RECORTTYPE_NON_VOLVO_GROUP) continue;
            
            if(isInsert) {
                relevantVehicles.add(v);
            }
            
            if(isUpdate) {
                Vehicle__c oldV = oldMap.get(v.Id);
                //Yang Wu Requirement Id: 1298903 START
                if(v.V_Quantity__c != oldV.V_Quantity__c || v.V_Usingcustomer__c != oldV.V_Usingcustomer__c) {
                //Yang Wu Requirement Id: 1298903 END
                    relevantVehicles.add(v);
                }
            }
        }
        
        if(!relevantVehicles.isEmpty()) {
            updateAccountCompetitorBrands(relevantVehicles, oldMap);
        }
    }
    
    /**********************************************************************************************
    * @Author:         Sivani
    * @Date:           01/09/2025
    * @Description:    1204403 - New field on the Account to update competitor vehicle value
    *                  1298903 - V_MainCompetitorBrand__c is null when competitor vehicles are added via imports in main account
    **********************************************************************************************/
    
    public static void updateAccountCompetitorBrands(List<Vehicle__c> newVehicles, Map<Id, Vehicle__c> oldMap) {
             
        if (newVehicles == null || newVehicles.isEmpty()) return;
        
        Set<Id> accountIds = new Set<Id>();
        for (Vehicle__c v : newVehicles) {
            if (v.V_Owner__c != null) accountIds.add(v.V_Owner__c);
            if (v.V_Usingcustomer__c != null) accountIds.add(v.V_Usingcustomer__c);
                }
        if (accountIds.isEmpty()) return;
        
        if (Limits.getQueueableJobs() < Limits.getLimitQueueableJobs()) {
            System.enqueueJob(
                new V_UpdateAccountCompetitorBrandsQueueable(accountIds)
            );
        }
    }

}
