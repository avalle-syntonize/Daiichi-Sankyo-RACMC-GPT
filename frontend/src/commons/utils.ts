export function flattenObject(originalObj: any) {
    const result: any = {};
  
    function recurse(currentObj: any) {
      for (const key in currentObj) {
        if (currentObj.hasOwnProperty(key)) {
          if (typeof currentObj[key] === 'object' && currentObj[key] !== null && !Array.isArray(currentObj[key])) {
            recurse(currentObj[key]); 
          } else {
            result[key] = currentObj[key]; 
          }
        }
      }
    }
  
    recurse(originalObj);
    return result;
  }
  
  export function flattenArray(originalArray: any[]) {
    const result: any[] = [];
  
    function processItems(items: any) {
        items.forEach((item: any) => {
            if (item.children && item.children.length > 0) {
                processItems(item.children);
            } else {
                const { children, ...rest } = item;
                result.push(rest);
            }
        });
    }
  
    processItems(originalArray);
    return result;
  }